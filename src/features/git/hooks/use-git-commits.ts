"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import type { CommitInfo, BranchRef, GitCommitsResponse } from "../../../app/api/github/git/commits/route";

export type { CommitInfo, BranchRef, GitCommitsResponse };

export function useGitCommits(projectId: Id<"projects">, isActive = false) {
  const project = useQuery(api.projects.getById, { id: projectId });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derive data from Convex — fully reactive, no API call needed
  const data = useMemo((): GitCommitsResponse | null => {
    if (!project?.gitCommitHistory) return null;
    try {
      const commits: CommitInfo[] = JSON.parse(project.gitCommitHistory);
      // Show current branch on HEAD commit
      const branches: BranchRef[] =
        project.gitBranch && project.gitLastCommitSha
          ? [{ name: project.gitBranch, sha: project.gitLastCommitSha, isCurrent: true }]
          : [];
      return { commits, branches, currentSha: project.gitLastCommitSha ?? null };
    } catch {
      return null;
    }
  }, [project?.gitCommitHistory, project?.gitBranch, project?.gitLastCommitSha]);

  // Manual refresh — calls GitHub API and stores result in Convex
  // The reactive subscription above picks up the update automatically
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const res = await fetch(`/api/github/git/commits?projectId=${projectId}`);
      const json = await res.json();
      if (!res.ok) setError(json.error || "Failed to fetch commits");
      // The API stores gitCommitHistory in Convex → data updates via subscription
    } catch {
      setError("Network error");
    } finally {
      setIsRefreshing(false);
    }
  }, [projectId]);

  // On first activation: if no cached history, fetch once from GitHub
  const prevActive = useRef(false);
  useEffect(() => {
    const becameActive = isActive && !prevActive.current;
    prevActive.current = isActive;
    if (becameActive && project !== undefined && !project?.gitCommitHistory) {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, project?.gitCommitHistory]);

  return {
    data,
    // Show loading when Convex subscription is still initializing OR doing a one-time API fetch
    isLoading: project === undefined || isRefreshing,
    error,
    refresh,
  };
}
