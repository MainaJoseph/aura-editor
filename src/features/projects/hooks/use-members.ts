import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

export const useMembers = (projectId: Id<"projects">) => {
  return useQuery(api.invites.getMembers, { projectId });
};

export const useInviteLinks = (projectId: Id<"projects">) => {
  return useQuery(api.invites.getInviteLinks, { projectId });
};

export const usePendingInvites = (email: string | undefined) => {
  return useQuery(
    api.invites.getPendingInvitesForUser,
    email ? { email } : "skip",
  );
};

export const useProjectRole = (projectId: Id<"projects">) => {
  return useQuery(api.invites.getProjectRole, { projectId });
};

export const useCreateInviteLink = () => {
  return useMutation(api.invites.createInviteLink);
};

export const useAcceptInviteLink = () => {
  return useMutation(api.invites.acceptInviteLink);
};

export const useRevokeInviteLink = () => {
  return useMutation(api.invites.revokeInviteLink);
};

export const useSendEmailInvite = () => {
  return useMutation(api.invites.sendEmailInvite);
};

export const useAcceptEmailInvite = () => {
  return useMutation(api.invites.acceptEmailInvite);
};

export const useDeclineEmailInvite = () => {
  return useMutation(api.invites.declineEmailInvite);
};

export const useRemoveMember = () => {
  return useMutation(api.invites.removeMember);
};

export const useUpdateMemberRole = () => {
  return useMutation(api.invites.updateMemberRole);
};
