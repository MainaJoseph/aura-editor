"use client";

import { useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Trash2Icon } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useConversations, useDeleteConversation } from "../hooks/use-conversations";

import { Id } from "../../../../convex/_generated/dataModel";

interface PastConversationsDialogProps {
  projectId: Id<"projects">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (conversationId: Id<"conversations">) => void;
}

export const PastConversationsDialog = ({
  projectId,
  open,
  onOpenChange,
  onSelect,
}: PastConversationsDialogProps) => {
  const conversations = useConversations(projectId);
  const deleteConversation = useDeleteConversation();
  const [deleteTarget, setDeleteTarget] = useState<{
    id: Id<"conversations">;
    title: string;
  } | null>(null);

  const handleSelect = (conversationId: Id<"conversations">) => {
    onSelect(conversationId);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteConversation({ id: deleteTarget.id });
      toast.success("Conversation deleted");
    } catch {
      toast.error("Failed to delete conversation");
    }
    setDeleteTarget(null);
  };

  return (
    <>
      <CommandDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Past Conversations"
        description="Search and select a past conversation"
      >
        <CommandInput placeholder="Search conversations..." />
        <CommandList>
          <CommandEmpty>No conversations found.</CommandEmpty>
          <CommandGroup heading="Conversations">
            {conversations?.map((conversation) => (
              <CommandItem
                key={conversation._id}
                value={`${conversation.title}-${conversation._id}`}
                onSelect={() => handleSelect(conversation._id)}
                className="group/item"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex flex-col gap-0.5">
                    <span>{conversation.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(conversation._creationTime, {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="opacity-0 group-hover/item:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget({
                        id: conversation._id,
                        title: conversation.title,
                      });
                    }}
                  >
                    <Trash2Icon className="size-3.5" />
                  </button>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.title}&quot;?
              This will permanently remove all messages in this conversation.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
