import { useState, useCallback, useEffect } from "react";

import { Id } from "../../../../convex/_generated/dataModel";

export interface GitBranchesData {
  branches: string[];
  currentBranch: string;
}

export function useGitBranches(projectId: Id<"projects">, enabled: boolean) {
  const [data, setData] = useState<GitBranchesData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/github/git/branches?projectId=${projectId}`, { signal });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to fetch branches");
      } else {
        setData(json as GitBranchesData);
      }
    } catch (err) {
      if ((err as { name?: string })?.name !== "AbortError") {
        setError("Network error");
      }
    } finally {
      setIsLoading(false);
    }
  }, [projectId, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    refresh(controller.signal);
    return () => controller.abort();
  }, [refresh, enabled]);

  return { data, isLoading, error, refresh };
}
