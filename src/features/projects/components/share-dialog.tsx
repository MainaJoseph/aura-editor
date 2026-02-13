"use client";

import { useState } from "react";
import {
  CopyIcon,
  LinkIcon,
  MailIcon,
  TrashIcon,
  CheckIcon,
  ClockIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  useMembers,
  useInviteLinks,
  useCreateInviteLink,
  useRevokeInviteLink,
  useRemoveMember,
  useUpdateMemberRole,
  useProjectRole,
} from "../hooks/use-members";
import { useProject } from "../hooks/use-projects";

export const ShareDialog = ({
  projectId,
  children,
}: {
  projectId: Id<"projects">;
  children: React.ReactNode;
}) => {
  const { user } = useUser();
  const project = useProject(projectId);
  const members = useMembers(projectId);
  const inviteLinks = useInviteLinks(projectId);
  const emailInvites = useQuery(api.invites.getEmailInvites, { projectId });
  const userRole = useProjectRole(projectId);

  const createInviteLink = useCreateInviteLink();
  const revokeInviteLink = useRevokeInviteLink();
  const sendEmailInvite = useMutation(api.invites.sendEmailInvite);
  const cancelEmailInvite = useMutation(api.invites.cancelEmailInvite);
  const removeMember = useRemoveMember();
  const updateMemberRole = useUpdateMemberRole();

  const [linkRole, setLinkRole] = useState<"editor" | "viewer">("editor");
  const [email, setEmail] = useState("");
  const [emailRole, setEmailRole] = useState<"editor" | "viewer">("editor");
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  const isOwner = userRole === "owner";

  const pendingEmailInvites = emailInvites?.filter(
    (inv) => inv.status === "pending",
  );

  const handleCreateLink = async () => {
    try {
      const result = await createInviteLink({ projectId, role: linkRole });
      const url = `${window.location.origin}/invite/${result.token}`;
      await navigator.clipboard.writeText(url);
      toast.success("Invite link copied to clipboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create link");
    }
  };

  const handleCopyLink = async (token: string, linkId: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedLinkId(linkId);
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  const handleSendEmail = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    setSendingEmail(true);
    try {
      // 1. Create/update the invite in the database
      await sendEmailInvite({ projectId, email: trimmedEmail, role: emailRole });

      // 2. Create an invite link for the email recipient
      const linkResult = await createInviteLink({
        projectId,
        role: emailRole,
      });

      // 3. Send the actual email via the API route
      const res = await fetch("/api/invite/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          projectName: project?.name ?? "Untitled Project",
          role: emailRole,
          inviterName: user?.fullName ?? user?.firstName ?? undefined,
          token: linkResult.token,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send email");
      }

      setEmail("");
      toast.success(`Invite sent to ${trimmedEmail}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleCancelEmailInvite = async (inviteId: Id<"emailInvites">) => {
    try {
      await cancelEmailInvite({ inviteId });
      toast.success("Invite cancelled");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to cancel invite",
      );
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share {project?.name ?? "Project"}</DialogTitle>
          <DialogDescription>
            Invite others to collaborate on this project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {/* Email invite */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Invite by email</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendEmail()}
                placeholder="email@example.com"
                className="flex-1 rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
              />
              <Select
                value={emailRole}
                onValueChange={(v) => setEmailRole(v as "editor" | "viewer")}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={handleSendEmail}
                disabled={!email.trim() || sendingEmail}
              >
                <MailIcon className="size-4 mr-1" />
                {sendingEmail ? "Sending..." : "Send"}
              </Button>
            </div>

            {/* Pending email invites */}
            {pendingEmailInvites && pendingEmailInvites.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {pendingEmailInvites.map((invite) => (
                  <div
                    key={invite._id}
                    className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <ClockIcon className="size-3.5 text-muted-foreground" />
                      <span className="truncate max-w-[200px]">
                        {invite.email}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {invite.role}
                      </span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-destructive"
                      onClick={() => handleCancelEmailInvite(invite._id)}
                    >
                      <XIcon className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Share link */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Share via link</label>
            <div className="flex gap-2">
              <Select
                value={linkRole}
                onValueChange={(v) => setLinkRole(v as "editor" | "viewer")}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={handleCreateLink}>
                <LinkIcon className="size-4 mr-1" />
                Create Link
              </Button>
            </div>

            {/* Existing links */}
            {inviteLinks && inviteLinks.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {inviteLinks.map((link) => (
                  <div
                    key={link._id}
                    className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <LinkIcon className="size-3.5 text-muted-foreground" />
                      <span className="capitalize">{link.role}</span>
                      <span className="text-muted-foreground">
                        ({link.useCount} uses)
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={() => handleCopyLink(link.token, link._id)}
                      >
                        {copiedLinkId === link._id ? (
                          <CheckIcon className="size-3.5" />
                        ) : (
                          <CopyIcon className="size-3.5" />
                        )}
                      </Button>
                      {isOwner && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-destructive"
                          onClick={() =>
                            revokeInviteLink({ linkId: link._id })
                          }
                        >
                          <TrashIcon className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Members list */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Members</label>
            <div className="space-y-1.5">
              {/* Owner */}
              <div className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-muted/50">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                    O
                  </div>
                  <span>Owner</span>
                </div>
                <span className="text-xs text-muted-foreground capitalize">
                  owner
                </span>
              </div>

              {/* Members */}
              {members?.map((member) => (
                <div
                  key={member._id}
                  className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded-full bg-accent flex items-center justify-center text-xs font-medium">
                      {member.userId.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="truncate max-w-[180px]">
                      {member.userId}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {isOwner ? (
                      <>
                        <Select
                          value={member.role}
                          onValueChange={(v) =>
                            updateMemberRole({
                              memberId: member._id,
                              role: v as "editor" | "viewer",
                            })
                          }
                        >
                          <SelectTrigger className="h-7 w-[90px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-destructive"
                          onClick={() =>
                            removeMember({ memberId: member._id })
                          }
                        >
                          <TrashIcon className="size-3.5" />
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground capitalize">
                        {member.role}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {(!members || members.length === 0) && (
                <p className="text-sm text-muted-foreground py-2 text-center">
                  No members yet. Share a link to invite collaborators.
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
