import { useMutation, useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

export const useConversation = (id: Id<"conversations"> | null) => {
  return useQuery(api.conversations.getById, id ? { id } : "skip");
};

export const useMessages = (conversationId: Id<"conversations"> | null) => {
  return useQuery(
    api.conversations.getMessages,
    conversationId ? { conversationId } : "skip",
  );
};

export const useConversations = (projectId: Id<"projects">) => {
  return useQuery(api.conversations.getByProject, { projectId });
};

export const useCreateConversation = () => {
  return useMutation(api.conversations.create).withOptimisticUpdate(
    (localStore, args) => {
      const existingConversations = localStore.getQuery(
        api.conversations.getByProject,
        { projectId: args.projectId },
      );

      if (existingConversations !== undefined) {
        // eslint-disable-next-line react-hooks/purity -- optimistic update callback runs on mutation, not render
        const now = Date.now();
        const newConversation = {
          _id: crypto.randomUUID() as Id<"conversations">,
          _creationTime: now,
          projectId: args.projectId,
          title: args.title,
          updatedAt: now,
        };

        localStore.setQuery(
          api.conversations.getByProject,
          { projectId: args.projectId },
          [newConversation, ...existingConversations],
        );
      }
    },
  );
};
