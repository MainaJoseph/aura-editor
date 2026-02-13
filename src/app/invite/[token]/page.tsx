"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { SignInButton, useAuth } from "@clerk/nextjs";

import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";

const InvitePage = ({
  params,
}: {
  params: Promise<{ token: string }>;
}) => {
  const { token } = use(params);
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inviteInfo = useQuery(api.invites.getInviteLinkByToken, { token });
  const acceptInvite = useMutation(api.invites.acceptInviteLink);

  const handleAccept = async () => {
    setIsAccepting(true);
    setError(null);

    try {
      const result = await acceptInvite({ token });
      router.push(`/projects/${result.projectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invite");
      setIsAccepting(false);
    }
  };

  if (inviteInfo === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Loading invite...</p>
        </div>
      </div>
    );
  }

  if (inviteInfo === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-semibold">Invalid Invite</h1>
          <p className="text-muted-foreground">
            This invite link is invalid or has been revoked.
          </p>
          <Button variant="outline" onClick={() => router.push("/")}>
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  if (inviteInfo.expired || inviteInfo.maxUsesReached) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-semibold">Invite Expired</h1>
          <p className="text-muted-foreground">
            {inviteInfo.expired
              ? "This invite link has expired."
              : "This invite link has reached its maximum number of uses."}
          </p>
          <Button variant="outline" onClick={() => router.push("/")}>
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-6 max-w-md p-8 rounded-lg border bg-card">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Project Invite</h1>
          <p className="text-muted-foreground">
            You&apos;ve been invited to join{" "}
            <span className="font-medium text-foreground">
              {inviteInfo.projectName}
            </span>{" "}
            as {inviteInfo.role === "editor" ? "an" : "a"}{" "}
            <span className="font-medium text-foreground capitalize">
              {inviteInfo.role}
            </span>
            .
          </p>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {isSignedIn ? (
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => router.push("/")}>
              Decline
            </Button>
            <Button onClick={handleAccept} disabled={isAccepting}>
              {isAccepting ? "Joining..." : "Accept Invite"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Sign in to accept this invite.
            </p>
            <SignInButton mode="modal">
              <Button>Sign In to Accept</Button>
            </SignInButton>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvitePage;
