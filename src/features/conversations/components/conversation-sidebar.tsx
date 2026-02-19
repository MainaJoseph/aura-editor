import ky from "ky";
import { UserButton } from "@clerk/nextjs";
import { toast } from "sonner";
import { useCallback, useState } from "react";
import { useMutation } from "convex/react";
import { AlertCircleIcon, CameraIcon, ClipboardCopyIcon, CopyIcon, HistoryIcon, ImageIcon, LoaderIcon, PanelLeftClose, PanelLeftOpen, PencilIcon, PlusIcon, RefreshCwIcon } from "lucide-react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  PromptInput,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuItem,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";

import { api } from "../../../../convex/_generated/api";
import { MessageAttachments } from "./message-attachments";

import {
  useConversation,
  useConversations,
  useCreateConversation,
  useMessages,
} from "../hooks/use-conversations";

import { Id } from "../../../../convex/_generated/dataModel";
import { DEFAULT_CONVERSATION_TITLE } from "../constants";
import { PastConversationsDialog } from "./past-conversations-dialog";

const AttachMenu = () => {
  const attachments = usePromptInputAttachments();

  const handleScreenshot = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "window" },
      });
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")!.drawImage(video, 0, 0);

      stream.getTracks().forEach((t) => t.stop());

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `screenshot-${Date.now()}.png`, {
            type: "image/png",
          });
          attachments.add([file]);
        }
      }, "image/png");
    } catch {
      // User cancelled the screen capture
    }
  };

  return (
    <PromptInputActionMenu>
      <PromptInputActionMenuTrigger aria-label="Add attachments">
        <PlusIcon className="size-4" />
      </PromptInputActionMenuTrigger>
      <PromptInputActionMenuContent className="min-w-[220px] rounded-xl bg-muted/80 p-1.5 backdrop-blur-sm border-border/50">
        <PromptInputActionMenuItem
          className="rounded-lg px-3 py-2.5 text-sm"
          onSelect={(e) => {
            e.preventDefault();
            attachments.openFileDialog();
          }}
        >
          <ImageIcon className="mr-2.5 size-4" />
          Add files or photos
        </PromptInputActionMenuItem>
        <PromptInputActionMenuItem
          className="rounded-lg px-3 py-2.5 text-sm"
          onSelect={handleScreenshot}
        >
          <CameraIcon className="mr-2.5 size-4" />
          Take a screenshot
        </PromptInputActionMenuItem>
      </PromptInputActionMenuContent>
    </PromptInputActionMenu>
  );
};

interface ConversationSidebarProps {
  projectId: Id<"projects">;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const ConversationSidebar = ({
  projectId,
  isCollapsed,
  onToggleCollapse,
}: ConversationSidebarProps) => {
  const [input, setInput] = useState("");
  const [selectedConversationId, setSelectedConversationId] =
    useState<Id<"conversations"> | null>(null);
  const [pastConversationsOpen, setPastConversationsOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const createConversation = useCreateConversation();
  const conversations = useConversations(projectId);
  const generateUploadUrl = useMutation(api.system.generateClientUploadUrl);

  const activeConversationId =
    selectedConversationId ?? conversations?.[0]?._id ?? null;

  const activeConversation = useConversation(activeConversationId);
  const conversationMessages = useMessages(activeConversationId);

  // Check if any message is currently processing
  const isProcessing = conversationMessages?.some(
    (msg) => msg.status === "processing",
  );

  const handleCancel = async () => {
    try {
      await ky.post("/api/messages/cancel", {
        json: { projectId },
      });
    } catch {
      toast.error("Unable to cancel request");
    }
  };

  const handleCreateConversation = async () => {
    try {
      const newConversationId = await createConversation({
        projectId,
        title: DEFAULT_CONVERSATION_TITLE,
      });
      setSelectedConversationId(newConversationId);
      return newConversationId;
    } catch {
      toast.error("Unable to create new conversation");
      return null;
    }
  };

  const handleSubmit = async (message: PromptInputMessage) => {
    // If processing and no new message, this is just a stop function
    if (isProcessing && !message.text) {
      await handleCancel();
      setInput("");
      return;
    }

    let conversationId = activeConversationId;

    if (!conversationId) {
      conversationId = await handleCreateConversation();
      if (!conversationId) {
        return;
      }
    }

    // Upload attached files to Convex storage
    let attachments: { storageId: string; mediaType: string; filename?: string }[] | undefined;

    if (message.files && message.files.length > 0) {
      try {
        attachments = await Promise.all(
          message.files.map(async (file) => {
            // Get upload URL from Convex
            const uploadUrl = await generateUploadUrl();

            // Fetch the file data from the data URL
            const response = await fetch(file.url);
            const blob = await response.blob();

            // Upload to Convex storage
            const result = await fetch(uploadUrl, {
              method: "POST",
              headers: { "Content-Type": file.mediaType || "application/octet-stream" },
              body: blob,
            });

            if (!result.ok) {
              throw new Error(`Upload failed with status ${result.status}`);
            }

            const { storageId } = await result.json();

            return {
              storageId,
              mediaType: file.mediaType || "image/png",
              filename: file.filename,
            };
          }),
        );
      } catch {
        toast.error("Failed to upload attachments");
        return;
      }
    }

    // Trigger Inngest function via API
    try {
      await ky.post("/api/messages", {
        json: {
          conversationId,
          message: message.text,
          attachments,
        },
      });
    } catch {
      toast.error("Message failed to send");
    }

    setInput("");
  };

  const handleRetry = useCallback(
    async (
      text: string,
      messageAttachments?: { storageId: string; mediaType: string; filename?: string }[],
    ) => {
      if (!activeConversationId || isProcessing) return;
      try {
        await ky.post("/api/messages", {
          json: {
            conversationId: activeConversationId,
            message: text,
            attachments: messageAttachments,
          },
        });
      } catch {
        toast.error("Message failed to send");
      }
    },
    [activeConversationId, isProcessing],
  );

  const handleEditSubmit = useCallback(async () => {
    if (!editingText.trim() || !activeConversationId || isProcessing) return;
    setEditingMessageId(null);
    try {
      await ky.post("/api/messages", {
        json: {
          conversationId: activeConversationId,
          message: editingText.trim(),
        },
      });
    } catch {
      toast.error("Message failed to send");
    }
    setEditingText("");
  }, [editingText, activeConversationId, isProcessing]);

  const formatMessageTime = (creationTime: number) => {
    const date = new Date(creationTime);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
    }

    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  };

  const formatFullTimestamp = (creationTime: number) => {
    return new Date(creationTime).toLocaleString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (isCollapsed) {
    return (
      <div className="w-10 h-full flex flex-col items-center bg-sidebar border-r shrink-0">
        <Button
          size="icon-xs"
          variant="highlight"
          className="mt-2"
          onClick={onToggleCollapse}
        >
          <PanelLeftOpen className="size-3.5" />
        </Button>
        <div className="mt-auto mb-3">
          <UserButton />
        </div>
      </div>
    );
  }

  return (
    <>
      <PastConversationsDialog
        projectId={projectId}
        open={pastConversationsOpen}
        onOpenChange={setPastConversationsOpen}
        onSelect={setSelectedConversationId}
      />
      <div className="flex flex-col h-full bg-sidebar">
        <div className="h-8.75 flex items-center justify-between border-b">
          <div className="text-sm truncate pl-3">
            {activeConversation?.title ?? DEFAULT_CONVERSATION_TITLE}
          </div>
          <div className="flex items-center px-1 gap-1">
            <Button
              size="icon-xs"
              variant="highlight"
              onClick={() => setPastConversationsOpen(true)}
            >
              <HistoryIcon className="size-3.5" />
            </Button>
            <Button
              size="icon-xs"
              variant="highlight"
              onClick={handleCreateConversation}
            >
              <PlusIcon className="size-3.5" />
            </Button>
            <Button
              size="icon-xs"
              variant="highlight"
              onClick={onToggleCollapse}
            >
              <PanelLeftClose className="size-3.5" />
            </Button>
          </div>
        </div>
        <Conversation className="flex-1">
          <ConversationContent>
            {conversationMessages?.map((message, messageIndex) => {
              // Skip cancelled assistant placeholders — they're merged into the preceding user message
              if (
                message.role === "assistant" &&
                message.status === "cancelled"
              ) {
                return null;
              }

              // Check if the next message is a cancelled assistant placeholder
              const nextMsg = conversationMessages[messageIndex + 1];
              const wasCancelled =
                nextMsg?.role === "assistant" &&
                nextMsg?.status === "cancelled";

              const isEditing = editingMessageId === message._id;

              return (
              <Message key={message._id} from={message.role}>
                <MessageContent>
                  {message.attachments && message.attachments.length > 0 && (
                    <MessageAttachments attachments={message.attachments} projectId={projectId} />
                  )}
                  {message.status === "processing" ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <LoaderIcon className="size-4 animate-spin" />
                      <span>Thinking...</span>
                    </div>
                  ) : isEditing ? (
                    <div className="flex flex-col gap-2 w-full">
                      <textarea
                        className="w-full rounded-md bg-background/50 border border-border p-2 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleEditSubmit();
                          }
                          if (e.key === "Escape") {
                            setEditingMessageId(null);
                            setEditingText("");
                          }
                        }}
                        rows={3}
                        autoFocus
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => {
                            setEditingMessageId(null);
                            setEditingText("");
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="text-xs bg-primary text-primary-foreground rounded-md px-3 py-1 hover:bg-primary/90 transition-colors"
                          onClick={() => handleEditSubmit()}
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  ) : (
                    <MessageResponse>{message.content}</MessageResponse>
                  )}
                  {wasCancelled && (
                    <span className="mt-1.5 flex items-center gap-1 text-muted-foreground text-xs italic">
                      Request cancelled
                      <AlertCircleIcon className="size-3 text-yellow-500" />
                    </span>
                  )}
                </MessageContent>
                {message.role === "user" && !isEditing && (
                  <MessageActions className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs text-muted-foreground mr-1 cursor-default">
                            {formatMessageTime(message._creationTime)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent><p>{formatFullTimestamp(message._creationTime)}</p></TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <MessageAction
                            label="Retry"
                            onClick={() => handleRetry(message.content, message.attachments)}
                          >
                            <RefreshCwIcon className="size-3" />
                          </MessageAction>
                        </TooltipTrigger>
                        <TooltipContent><p>Retry</p></TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <MessageAction
                            label="Edit"
                            onClick={() => {
                              setEditingMessageId(message._id);
                              setEditingText(message.content);
                            }}
                          >
                            <PencilIcon className="size-3" />
                          </MessageAction>
                        </TooltipTrigger>
                        <TooltipContent><p>Edit</p></TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <MessageAction
                            label="Copy"
                            onClick={() => {
                              navigator.clipboard.writeText(message.content);
                              toast.success("Copied to clipboard");
                            }}
                          >
                            <ClipboardCopyIcon className="size-3" />
                          </MessageAction>
                        </TooltipTrigger>
                        <TooltipContent><p>Copy</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </MessageActions>
                )}
                {message.role === "assistant" &&
                  message.status === "completed" &&
                  messageIndex === (conversationMessages?.length ?? 0) - 1 && (
                    <MessageActions>
                      <MessageAction
                        onClick={() => {
                          navigator.clipboard.writeText(message.content);
                        }}
                        label="Copy"
                      >
                        <CopyIcon className="size-3" />
                      </MessageAction>
                    </MessageActions>
                  )}
              </Message>
              );
            })}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
        <div className="p-3">
          <PromptInput
            onSubmit={handleSubmit}
            className="mt-2"
            accept="image/*"
            maxFileSize={5 * 1024 * 1024}
            onError={(err) => toast.error(err.message)}
          >
            <PromptInputAttachments>
              {(attachment) => <PromptInputAttachment data={attachment} />}
            </PromptInputAttachments>
            <PromptInputBody>
              <PromptInputTextarea
                placeholder="Ask Aura anything..."
                onChange={(e) => setInput(e.target.value)}
                value={input}
                disabled={isProcessing}
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <AttachMenu />
              </PromptInputTools>
              <PromptInputSubmit
                disabled={isProcessing ? false : !input}
                status={isProcessing ? "streaming" : undefined}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </>
  );
};
