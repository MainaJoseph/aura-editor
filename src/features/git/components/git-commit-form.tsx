"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";

import { useGitStore } from "../store/use-git-store";
import { Id } from "../../../../convex/_generated/dataModel";

interface GitCommitFormProps {
  projectId: Id<"projects">;
  onCommitSuccess: () => void;
}

export const GitCommitForm = ({ projectId, onCommitSuccess }: GitCommitFormProps) => {
  const { stagedPaths, commitMessage, setCommitMessage, reset } = useGitStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCommit = stagedPaths.size > 0 && commitMessage.trim().length > 0;

  const handleCommit = async () => {
    if (!canCommit) return;
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/github/git/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          message: commitMessage.trim(),
          stagedPaths: Array.from(stagedPaths),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to commit");
      } else {
        reset();
        onCommitSuccess();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-3 border-t">
      <textarea
        value={commitMessage}
        onChange={(e) => setCommitMessage(e.target.value)}
        placeholder="Commit message"
        rows={3}
        disabled={isLoading}
        className="w-full px-2.5 py-1.5 text-sm rounded-md border bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 placeholder:text-muted-foreground"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <button
        onClick={handleCommit}
        disabled={!canCommit || isLoading}
        className="flex items-center justify-center gap-2 w-full py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader2Icon className="size-4 animate-spin" />
            Committing...
          </>
        ) : (
          `Commit & Push${stagedPaths.size > 0 ? ` (${stagedPaths.size})` : ""}`
        )}
      </button>
    </div>
  );
};
