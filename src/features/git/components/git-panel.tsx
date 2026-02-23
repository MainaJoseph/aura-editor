"use client";

import { useState } from "react";
import { Loader2Icon, GitBranchIcon } from "lucide-react";
import { useQuery } from "convex/react";

import { cn } from "@/lib/utils";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useGitStore } from "../store/use-git-store";
import { GitConnectView } from "./git-connect-view";
import { GitStatusView } from "./git-status-view";
import { GitGraphView } from "./git-graph-view";
import { GitBranchesPopover } from "./git-branches-popover";

interface GitPanelProps {
  projectId: Id<"projects">;
  isActive?: boolean;
}

export const GitPanel = ({ projectId, isActive = false }: GitPanelProps) => {
  const project = useQuery(api.projects.getById, { id: projectId });
  const [isPulling, setIsPulling] = useState(false);
  const [pullError, setPullError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"changes" | "history">("changes");
  const changeCount = useGitStore((s) => s.changeCount);

  if (project === undefined) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        Project not found
      </div>
    );
  }

  const isSyncing = !!project.gitSyncStatus;

  if (!project.gitRepo) {
    return (
      <GitConnectView
        projectId={projectId}
        projectName={project.name}
        isSyncing={project.gitSyncStatus === "connecting"}
        exportRepoUrl={project.exportRepoUrl}
      />
    );
  }

  const handlePull = async () => {
    setPullError(null);
    setIsPulling(true);
    try {
      const res = await fetch("/api/github/git/pull", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPullError(data.error || "Pull failed");
      }
    } catch {
      setPullError("Network error");
    } finally {
      setIsPulling(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b shrink-0">
        <GitBranchIcon className="size-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground flex-1">
          Source Control
        </span>
        {project.gitBranch && (
          <GitBranchesPopover
            projectId={projectId}
            currentBranch={project.gitBranch}
            onBranchSwitch={() => {}}
          />
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b shrink-0">
        <button
          onClick={() => setActiveTab("changes")}
          className={cn(
            "flex-1 py-1.5 text-xs font-medium transition-colors",
            activeTab === "changes"
              ? "text-foreground border-b-2 border-primary -mb-px"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Changes
          {changeCount > 0 && (
            <span className="ml-1.5 px-1 py-px text-[10px] rounded-full bg-primary/20 text-primary font-bold">
              {changeCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={cn(
            "flex-1 py-1.5 text-xs font-medium transition-colors",
            activeTab === "history"
              ? "text-foreground border-b-2 border-primary -mb-px"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          History
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {activeTab === "changes" ? (
          <>
            {/* Syncing overlay */}
            {isSyncing && (
              <div className="flex items-center gap-2 px-3 py-2 bg-accent/50 text-sm text-muted-foreground border-b">
                <Loader2Icon className="size-3.5 animate-spin" />
                <span>
                  {project.gitSyncStatus === "committing" && "Committing & pushing..."}
                  {project.gitSyncStatus === "pulling" && "Pulling from remote..."}
                  {project.gitSyncStatus === "connecting" && "Connecting repository..."}
                </span>
              </div>
            )}
            {pullError && (
              <div className="px-3 py-1.5 text-xs text-destructive border-b">
                {pullError}
              </div>
            )}
            {!isSyncing && (
              <GitStatusView
                projectId={projectId}
                gitBranch={project.gitBranch ?? "main"}
                onPull={handlePull}
                isPulling={isPulling}
                isActive={isActive && activeTab === "changes"}
              />
            )}
          </>
        ) : (
          <GitGraphView
            projectId={projectId}
            isActive={isActive && activeTab === "history"}
          />
        )}
      </div>
    </div>
  );
};
