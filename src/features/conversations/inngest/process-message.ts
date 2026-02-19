import {
  createAgent,
  anthropic,
  gemini,
  createNetwork,
} from "@inngest/agent-kit";
import { generateText } from "ai";
import { anthropic as anthropicAi } from "@ai-sdk/anthropic";

import { inngest } from "@/inngest/client";
import { Id } from "../../../../convex/_generated/dataModel";
import { NonRetriableError } from "inngest";
import { convex } from "@/lib/convex-client";
import { api } from "../../../../convex/_generated/api";
import {
  CODING_AGENT_SYSTEM_PROMPT,
  TITLE_GENERATOR_SYSTEM_PROMPT,
} from "./constants";
import { DEFAULT_CONVERSATION_TITLE } from "../constants";
import { createReadFilesTool } from "./tools/read-files";
import { createListFilesTool } from "./tools/list-files";
import { createUpdateFileTool } from "./tools/update-file";
import { createCreateFilesTool } from "./tools/create-files";
import { createCreateFolderTool } from "./tools/create-folder";
import { createRenameFileTool } from "./tools/rename-file";
import { createDeleteFilesTool } from "./tools/delete-files";
import { createScrapeUrlsTool } from "./tools/scrape-urls";

interface AttachmentData {
  storageId: Id<"_storage">;
  mediaType: string;
  filename?: string;
}

interface MessageEvent {
  messageId: Id<"messages">;
  conversationId: Id<"conversations">;
  projectId: Id<"projects">;
  message: string;
  attachments?: AttachmentData[];
}

export const processMessage = inngest.createFunction(
  {
    id: "process-message",
    cancelOn: [
      {
        event: "message/cancel",
        if: "event.data.messageId == async.data.messageId",
      },
    ],
    onFailure: async ({ event, step }) => {
      const { messageId } = event.data.event.data as MessageEvent;
      const internalKey = process.env.AURA_CONVEX_INTERNAL_KEY;

      // Update the message with error content
      if (internalKey) {
        await step.run("update-message-on-failure", async () => {
          await convex.mutation(api.system.updateMessageContent, {
            internalKey,
            messageId,
            content:
              "My apologies, I encountered an error while processing your request. Let me know if you need anything else!",
          });
        });
      }
    },
  },
  {
    event: "message/sent",
  },
  async ({ event, step }) => {
    const { messageId, conversationId, projectId, message, attachments } =
      event.data as MessageEvent;

    const internalKey = process.env.AURA_CONVEX_INTERNAL_KEY;

    if (!internalKey) {
      throw new NonRetriableError("AURA_CONVEX_INTERNAL_KEY is not configured");
    }

    // TODO: Check if this is needed
    await step.sleep("wait-for-db-sync", "1s");

    // Get conversation for title generation check
    const conversation = await step.run("get-conversation", async () => {
      return await convex.query(api.system.getConversationById, {
        internalKey,
        conversationId,
      });
    });

    if (!conversation) {
      throw new NonRetriableError("Conversation not found");
    }

    // Fetch recent messages for conversation context
    const recentMessages = await step.run("get-recent-messages", async () => {
      return await convex.query(api.system.getRecentMessages, {
        internalKey,
        conversationId,
        limit: 10,
      });
    });

    // Build system prompt with conversation history (exclude the current processing message)
    let systemPrompt = CODING_AGENT_SYSTEM_PROMPT;

    // Filter out the current processing message and empty messages
    const contextMessages = recentMessages.filter(
      (msg) => msg._id !== messageId && msg.content.trim() !== "",
    );

    if (contextMessages.length > 0) {
      const historyText = contextMessages
        .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
        .join("\n\n");

      systemPrompt += `\n\n## Previous Conversation (for context only - do NOT repeat these responses):\n${historyText}\n\n## Current Request:\nRespond ONLY to the user's new message below. Do not repeat or reference your previous responses.`;
    }

    // Generate conversation title if it's still the default
    const shouldGenerateTitle =
      conversation.title === DEFAULT_CONVERSATION_TITLE;

    if (shouldGenerateTitle) {
      const titleAgent = createAgent({
        name: "title-generator",
        system: TITLE_GENERATOR_SYSTEM_PROMPT,
        model: anthropic({
          model: "claude-haiku-4-5-20251001",
          defaultParameters: { temperature: 0, max_tokens: 50 },
        }),
      });

      const { output } = await titleAgent.run(message, { step });

      const textMessage = output.find(
        (m) => m.type === "text" && m.role === "assistant",
      );

      if (textMessage?.type === "text") {
        const title =
          typeof textMessage.content === "string"
            ? textMessage.content.trim()
            : textMessage.content
                .map((c) => c.text)
                .join("")
                .trim();

        if (title) {
          await step.run("update-conversation-title", async () => {
            await convex.mutation(api.system.updateConversationTitle, {
              internalKey,
              conversationId,
              title,
            });
          });
        }
      }
    }

    // Create the coding agent with file tools
    const codingAgent = createAgent({
      name: "aura",
      description: "An expert AI coding assistant",
      system: systemPrompt,
      model: anthropic({
        model: "claude-sonnet-4-6",
        defaultParameters: { temperature: 0.3, max_tokens: 16000 },
      }),
      tools: [
        createListFilesTool({ internalKey, projectId }),
        createReadFilesTool({ internalKey }),
        createUpdateFileTool({ internalKey }),
        createCreateFilesTool({ projectId, internalKey }),
        createCreateFolderTool({ projectId, internalKey }),
        createRenameFileTool({ internalKey }),
        createDeleteFilesTool({ internalKey }),
        createScrapeUrlsTool(),
      ],
    });

    // Create network with single agent
    const network = createNetwork({
      name: "aura-network",
      agents: [codingAgent],
      maxIter: 20,
      router: ({ network }) => {
        const lastResult = network.state.results.at(-1);
        const hasTextResponse = lastResult?.output.some(
          (m) => m.type === "text" && m.role === "assistant",
        );
        const hasToolCalls = lastResult?.output.some(
          (m) => m.type === "tool_call",
        );

        // Anthropic outputs text AND tool calls together
        // Only stop if there's text WITHOUT tool calls (final response)
        if (hasTextResponse && !hasToolCalls) {
          return undefined;
        }
        return codingAgent;
      },
    });

    // If attachments exist, use Vercel AI SDK to analyze images with Claude Vision,
    // then pass the description to the agent network (which doesn't support multi-part content)
    let agentInput = message;

    if (attachments && attachments.length > 0) {
      const visionDescription = await step.run("analyze-attachment-images", async () => {
        const imageParts: Array<{ type: "image"; image: URL }> = [];

        for (const attachment of attachments) {
          try {
            const url = await convex.query(api.system.getAttachmentUrlInternal, {
              internalKey,
              storageId: attachment.storageId,
            });

            if (url) {
              imageParts.push({ type: "image" as const, image: new URL(url) });
            }
          } catch (err) {
            console.error("Failed to fetch attachment URL:", err);
          }
        }

        if (imageParts.length === 0) return null;

        const { text } = await generateText({
          model: anthropicAi("claude-sonnet-4-6"),
          messages: [
            {
              role: "user",
              content: [
                ...imageParts,
                {
                  type: "text" as const,
                  text: `The user has shared ${imageParts.length > 1 ? "these images" : "this image"} with the following message: "${message}"\n\nProvide a detailed description of what you see in the image(s), then respond to the user's message in context. Be thorough about visual details like layout, colors, text, UI elements, code, errors, or any other relevant information visible in the image(s).`,
                },
              ],
            },
          ],
        });

        return text;
      });

      if (visionDescription) {
        agentInput = `[The user shared ${attachments.length > 1 ? "images" : "an image"} with this message: "${message}"]\n\n[Image Analysis]\n${visionDescription}\n\n[User's Request]\n${message}`;
      }
    }

    // Run the agent
    const result = await network.run(agentInput);

    // Extract the assistant's text response from the last agent result
    const lastResult = result.state.results.at(-1);
    const textMessage = lastResult?.output.find(
      (m) => m.type === "text" && m.role === "assistant",
    );

    let assistantResponse =
      "I processed your request. Let me know if you need anything else!";

    if (textMessage?.type === "text") {
      assistantResponse =
        typeof textMessage.content === "string"
          ? textMessage.content
          : textMessage.content.map((c) => c.text).join("");
    }

    // Update the assistant message with the response (this also sets status to completed)
    await step.run("update-assistant-message", async () => {
      await convex.mutation(api.system.updateMessageContent, {
        internalKey,
        messageId,
        content: assistantResponse,
      });
    });

    return { success: true, messageId, conversationId };
  },
);
