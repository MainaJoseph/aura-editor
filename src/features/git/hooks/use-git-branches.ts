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

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/github/git/branches?projectId=${projectId}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to fetch branches");
      } else {
        setData(json as GitBranchesData);
      }
    } catch {
      setError("Network error");
    } finally {
      setIsLoading(false);
    }
  }, [projectId, enabled]);

  useEffect(() => {
    if (enabled) refresh();
  }, [refresh, enabled]);

  return { data, isLoading, error, refresh };
}
