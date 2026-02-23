"use client";

import { useState } from "react";
import { Loader2Icon, GitBranchIcon } from "lucide-react";

import { Id } from "../../../../convex/_generated/dataModel";

interface GitConnectViewProps {
  projectId: Id<"projects">;
  projectName: string;
  isSyncing: boolean;
  exportRepoUrl?: string;
}

type Mode = "create" | "link";

export const GitConnectView = ({ projectId, projectName, isSyncing, exportRepoUrl }: GitConnectViewProps) => {
  const [mode, setMode] = useState<Mode>(exportRepoUrl ? "link" : "create");
  const [repoName, setRepoName] = useState(
    projectName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
  );
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [repoUrl, setRepoUrl] = useState(exportRepoUrl ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const body =
        mode === "create"
          ? { mode: "create", projectId, repoName, visibility }
          : { mode: "link", projectId, repoUrl };

      const res = await fetch("/api/github/git/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to connect repository");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const busy = isLoading || isSyncing;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        <GitBranchIcon className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Source Control
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-xs">
          {exportRepoUrl ? (
            <div className="mb-4 px-3 py-2 rounded-md bg-accent/60 border text-xs text-foreground">
              This project was previously exported to GitHub. Link it below to enable source control.
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center mb-4">
              Connect this project to a GitHub repository to track changes and collaborate.
            </p>
          )}

          {/* Mode tabs */}
          <div className="flex rounded-md border mb-4 overflow-hidden text-sm">
            <button
              type="button"
              onClick={() => setMode("create")}
              className={`flex-1 py-1.5 transition-colors ${
                mode === "create"
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/50"
              }`}
            >
              Create new
            </button>
            <button
              type="button"
              onClick={() => setMode("link")}
              className={`flex-1 py-1.5 border-l transition-colors ${
                mode === "link"
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/50"
              }`}
            >
              Link existing
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {mode === "create" ? (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Repository name</label>
                  <input
                    type="text"
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value)}
                    required
                    disabled={busy}
                    className="w-full px-2.5 py-1.5 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                    placeholder="my-project"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Visibility</label>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as "public" | "private")}
                    disabled={busy}
                    className="w-full px-2.5 py-1.5 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                  >
                    <option value="private">Private</option>
                    <option value="public">Public</option>
                  </select>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">GitHub repository URL</label>
                <input
                  type="url"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  required
                  disabled={busy}
                  className="w-full px-2.5 py-1.5 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                  placeholder="https://github.com/owner/repo"
                />
              </div>
            )}

            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex items-center justify-center gap-2 w-full py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  {isSyncing ? "Syncing..." : "Connecting..."}
                </>
              ) : mode === "create" ? (
                "Create & Connect"
              ) : (
                "Link Repository"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
