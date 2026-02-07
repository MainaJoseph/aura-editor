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
import { PlusIcon } from "lucide-react";

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
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";

import { Id } from "../../../../convex/_generated/dataModel";
import { useCreateProject } from "../hooks/use-projects";

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NewProjectDialog = ({
  open,
  onOpenChange,
}: NewProjectDialogProps) => {
  const router = useRouter();
  const createProject = useCreateProject();
  const [input, setInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (message: PromptInputMessage) => {
    if (!message.text) return;

    setIsSubmitting(true);

    try {
      const { projectId } = await ky
        .post("/api/projects/create-with-prompt", {
          json: { prompt: message.text.trim() },
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
    const projectName = uniqueNamesGenerator({
      dictionaries: [adjectives, animals, colors],
      separator: "-",
      length: 3,
    });

    const projectId = await createProject({ name: projectName });
    onOpenChange(false);
    router.push(`/projects/${projectId}`);
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
        <PromptInput onSubmit={handleSubmit} className="border-none!">
          <PromptInputBody>
            <PromptInputTextarea
              placeholder="Ask Aura to build..."
              onChange={(e) => setInput(e.target.value)}
              value={input}
              disabled={isSubmitting}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools />
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
