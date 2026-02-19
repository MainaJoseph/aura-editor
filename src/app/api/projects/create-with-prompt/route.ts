import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  adjectives,
  animals,
  colors,
  uniqueNamesGenerator,
} from "unique-names-generator";

import { DEFAULT_CONVERSATION_TITLE } from "@/features/conversations/constants";

import { inngest } from "@/inngest/client";
import { convex } from "@/lib/convex-client";

import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

const requestSchema = z.object({
  prompt: z.string().min(1),
  attachments: z.optional(
    z.array(
      z.object({
        storageId: z.string(),
        mediaType: z.string(),
        filename: z.string().optional(),
      }),
    ),
  ),
});

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const internalKey = process.env.AURA_CONVEX_INTERNAL_KEY;

  if (!internalKey) {
    return NextResponse.json(
      { error: "Internal key not configured" },
      { status: 500 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let prompt: string;
  let attachments: { storageId: string; mediaType: string; filename?: string }[] | undefined;
  try {
    ({ prompt, attachments } = requestSchema.parse(body));
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Generate a random project name
  const projectName = uniqueNamesGenerator({
    dictionaries: [adjectives, animals, colors],
    separator: "-",
    length: 3,
  });

  // Create project and conversation together
  const { projectId, conversationId } = await convex.mutation(
    api.system.createProjectWithConversation,
    {
      internalKey,
      projectName,
      conversationTitle: DEFAULT_CONVERSATION_TITLE,
      ownerId: userId,
    },
  );

  try {
    // Create user message
    await convex.mutation(api.system.createMessage, {
      internalKey,
      conversationId,
      projectId,
      role: "user",
      content: prompt,
      attachments: attachments?.map((a) => ({
        ...a,
        storageId: a.storageId as Id<"_storage">,
      })),
    });

    // Create assistant message placeholder with processing status
    const assistantMessageId = await convex.mutation(api.system.createMessage, {
      internalKey,
      conversationId,
      projectId,
      role: "assistant",
      content: "",
      status: "processing",
    });

    // Trigger Inngest to process the message
    await inngest.send({
      name: "message/sent",
      data: {
        messageId: assistantMessageId,
        conversationId,
        projectId,
        message: prompt,
        attachments,
      },
    });
  } catch (error) {
    console.error("Failed to initialize project conversation:", error);
    // Project was created — return it so the user can still use it,
    // but signal that the AI prompt was not processed.
    return NextResponse.json({ projectId, promptFailed: true });
  }

  return NextResponse.json({ projectId });
}
