"use client";

import { useEffect } from "react";
import { RefreshCwIcon, GitPullRequestIcon, Loader2Icon } from "lucide-react";

import { useGitStatus } from "../hooks/use-git-status";
import { useGitStore } from "../store/use-git-store";
import { GitFileItem } from "./git-file-item";
import { GitCommitForm } from "./git-commit-form";
import { Id } from "../../../../convex/_generated/dataModel";

interface GitStatusViewProps {
  projectId: Id<"projects">;
  gitBranch: string;
  onPull: () => void;
  isPulling: boolean;
  isActive?: boolean;
}

export const GitStatusView = ({ projectId, gitBranch, onPull, isPulling, isActive = false }: GitStatusViewProps) => {
  const { data, isLoading, error, refresh } = useGitStatus(projectId, isActive);
  const { stagedPaths, toggleStaged, stageAll, unstageAll, diffPath, setDiffPath } = useGitStore();

  const allChangedPaths = data
    ? [...data.modified, ...data.added, ...data.deleted]
    : [];

  const totalChanges = allChangedPaths.length;

  useEffect(() => {
    // Unstage any paths that are no longer changed
    if (data) {
      const changedSet = new Set(allChangedPaths);
      const toUnstage = Array.from(stagedPaths).filter((p) => !changedSet.has(p));
      if (toUnstage.length > 0) {
        toUnstage.forEach((p) => toggleStaged(p));
      }
      // Clear diff if the file is no longer changed
      if (diffPath && !changedSet.has(diffPath)) {
        setDiffPath(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const handleStageAll = () => {
    stageAll(allChangedPaths);
  };

  const renderFile = (path: string, status: "M" | "A" | "D") => (
    <GitFileItem
      key={path}
      path={path}
      status={status}
      staged={stagedPaths.has(path)}
      selected={diffPath === path}
      onToggle={toggleStaged}
      onOpenDiff={setDiffPath}
    />
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-1 px-3 py-2 border-b shrink-0">
        <span className="text-sm font-medium flex-1">
          Changes
          {totalChanges > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-accent text-foreground">
              {totalChanges}
            </span>
          )}
        </span>
        {data?.remoteAhead && (
          <span className="text-xs text-yellow-500 mr-1">Remote ahead</span>
        )}
        <button
          onClick={onPull}
          disabled={isPulling}
          title="Pull from remote"
          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {isPulling ? (
            <Loader2Icon className="size-3.5 animate-spin" />
          ) : (
            <GitPullRequestIcon className="size-3.5" />
          )}
        </button>
        <button
          onClick={refresh}
          disabled={isLoading}
          title="Refresh"
          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2Icon className="size-3.5 animate-spin" />
          ) : (
            <RefreshCwIcon className="size-3.5" />
          )}
        </button>
      </div>

      {/* Stage all / unstage all */}
      {totalChanges > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b shrink-0">
          {/* Use intersection count to guard against stale staged paths */}
          {(() => {
            const stagedCount = allChangedPaths.filter((p) => stagedPaths.has(p)).length;
            return (
              <>
                <label className="sr-only" htmlFor="stage-all-checkbox">
                  Stage all changes
                </label>
                <input
                  id="stage-all-checkbox"
                  type="checkbox"
                  checked={stagedCount === totalChanges}
                  ref={(el) => {
                    if (el) el.indeterminate = stagedCount > 0 && stagedCount < totalChanges;
                  }}
                  onChange={() => {
                    if (stagedCount === totalChanges) {
                      unstageAll();
                    } else {
                      handleStageAll();
                    }
                  }}
                  className="size-3.5 cursor-pointer accent-primary"
                  title={stagedCount === totalChanges ? "Unstage all" : "Stage all"}
                />
              </>
            );
          })()}
          <button
            onClick={handleStageAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Stage All
          </button>
          <span className="text-muted-foreground text-xs">·</span>
          <button
            onClick={unstageAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Unstage All
          </button>
        </div>
      )}

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && !data && (
          <div className="flex items-center justify-center h-20">
            <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="px-3 py-3 text-xs text-destructive">{error}</div>
        )}

        {!isLoading && !error && totalChanges === 0 && (
          <div className="px-3 py-4 text-xs text-muted-foreground text-center">
            No changes on <span className="font-medium">{gitBranch}</span>
          </div>
        )}

        {data && (
          <>
            {data.modified.length > 0 && (
              <div>
                <div className="px-3 py-1 text-xs text-muted-foreground font-medium uppercase tracking-wide border-b bg-sidebar">
                  Modified ({data.modified.length})
                </div>
                {data.modified.map((path) => renderFile(path, "M"))}
              </div>
            )}
            {data.added.length > 0 && (
              <div>
                <div className="px-3 py-1 text-xs text-muted-foreground font-medium uppercase tracking-wide border-b bg-sidebar">
                  Added ({data.added.length})
                </div>
                {data.added.map((path) => renderFile(path, "A"))}
              </div>
            )}
            {data.deleted.length > 0 && (
              <div>
                <div className="px-3 py-1 text-xs text-muted-foreground font-medium uppercase tracking-wide border-b bg-sidebar">
                  Deleted ({data.deleted.length})
                </div>
                {data.deleted.map((path) => renderFile(path, "D"))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Commit form */}
      <GitCommitForm projectId={projectId} onCommitSuccess={refresh} />
    </div>
  );
};
