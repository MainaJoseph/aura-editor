"use client";

import { useState } from "react";
import ky from "ky";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  adjectives,
  animals,
  colors,
  uniqueNamesGenerator,
} from "unique-names-generator";
import { CameraIcon, ImageIcon, PlusIcon } from "lucide-react";
import { useMutation } from "convex/react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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

import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useCreateProject } from "../hooks/use-projects";

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
          attachments.add([
            new File([blob], `screenshot-${Date.now()}.png`, {
              type: "image/png",
            }),
          ]);
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

export const NewProjectDialog = ({
  open,
  onOpenChange,
}: NewProjectDialogProps) => {
  const router = useRouter();
  const createProject = useCreateProject();
  const [input, setInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const generateUploadUrl = useMutation(api.system.generateClientUploadUrl);

  const handleSubmit = async (message: PromptInputMessage) => {
    if (!message.text) return;

    setIsSubmitting(true);

    try {
      // Upload attached files to Convex storage
      let attachments:
        | { storageId: string; mediaType: string; filename?: string }[]
        | undefined;

      if (message.files && message.files.length > 0) {
        try {
          attachments = await Promise.all(
            message.files.map(async (file) => {
              const uploadUrl = await generateUploadUrl();

              const response = await fetch(file.url);
              const blob = await response.blob();

              const result = await fetch(uploadUrl, {
                method: "POST",
                headers: {
                  "Content-Type": file.mediaType || "application/octet-stream",
                },
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
          setIsSubmitting(false);
          return;
        }
      }

      const { projectId } = await ky
        .post("/api/projects/create-with-prompt", {
          json: { prompt: message.text.trim(), attachments },
        })
        .json<{ projectId: Id<"projects"> }>();

      toast.success("Project created");
      onOpenChange(false);
      setInput("");
      router.push(`/projects/${projectId}`);
    } catch {
      toast.error("Unable to create project");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateBlankProject = async () => {
    setIsSubmitting(true);

    try {
      const projectName = uniqueNamesGenerator({
        dictionaries: [adjectives, animals, colors],
        separator: "-",
        length: 3,
      });

      const projectId = await createProject({ name: projectName });
      onOpenChange(false);
      router.push(`/projects/${projectId}`);
    } catch {
      toast.error("Unable to create project");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-lg p-0">
        <DialogHeader className="hidden">
          <DialogTitle>What do you want to build?</DialogTitle>
          <DialogDescription>
            Describe your project and AI will help you create it.
          </DialogDescription>
        </DialogHeader>
        <PromptInput
          onSubmit={handleSubmit}
          className="border-none!"
          accept="image/*"
          maxFileSize={5 * 1024 * 1024}
          onError={(err) => toast.error(err.message)}
        >
          <PromptInputAttachments>
            {(attachment) => <PromptInputAttachment data={attachment} />}
          </PromptInputAttachments>
          <PromptInputBody>
            <PromptInputTextarea
              placeholder="Ask Aura to build..."
              onChange={(e) => setInput(e.target.value)}
              value={input}
              disabled={isSubmitting}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <AttachMenu />
            </PromptInputTools>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCreateBlankProject}
                disabled={isSubmitting}
                className="text-muted-foreground text-xs"
              >
                <PlusIcon className="size-3.5" />
                Blank project
              </Button>
              <PromptInputSubmit disabled={!input || isSubmitting} />
            </div>
          </PromptInputFooter>
        </PromptInput>
      </DialogContent>
    </Dialog>
  );
};
