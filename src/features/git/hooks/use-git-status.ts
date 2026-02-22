"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useGitStore } from "../store/use-git-store";

export interface GitStatus {
  modified: string[];
  added: string[];
  deleted: string[];
  remoteAhead: boolean;
  localSha: string;
  remoteSha: string;
}

async function computeGitBlobSha(content: string): Promise<string> {
  const encoded = new TextEncoder().encode(content);
  const header = new TextEncoder().encode(`blob ${encoded.byteLength}\0`);
  const full = new Uint8Array(header.byteLength + encoded.byteLength);
  full.set(header);
  full.set(encoded, header.byteLength);
  const hashBuffer = await crypto.subtle.digest("SHA-1", full);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function useGitStatus(projectId: Id<"projects">, isActive = false) {
  // Real-time Convex subscriptions
  const files = useQuery(api.files.getFiles, { projectId });
  const project = useQuery(api.projects.getById, { id: projectId });

  const [status, setStatus] = useState<GitStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setChangeCount = useGitStore((s) => s.setChangeCount);

  // These are only updated by the manual refresh (GitHub API call)
  const remoteAheadRef = useRef(false);
  const remoteShaRef = useRef("");

  // Reactive computation — runs whenever local files or cached remote tree change
  useEffect(() => {
    if (!files || !project || !project.gitRemoteTree) return;

    let cancelled = false;

    async function compute() {
      try {
        const remoteTree: { path: string; sha: string }[] = JSON.parse(
          project!.gitRemoteTree!,
        );
        const remoteMap = new Map(remoteTree.map((e) => [e.path, e.sha]));

        // Build a flat path map from parent IDs
        const fileMap = new Map(files!.map((f) => [f._id, f]));
        const getPath = (id: Id<"files">): string => {
          const f = fileMap.get(id);
          if (!f) return "";
          const parent = f.parentId ? getPath(f.parentId) : null;
          return parent ? `${parent}/${f.name}` : f.name;
        };

        const modified: string[] = [];
        const added: string[] = [];
        const localPaths = new Set<string>();

        for (const file of files!) {
          if (file.type !== "file") continue;
          const path = getPath(file._id);
          if (!path) continue;
          localPaths.add(path);

          if (file.content !== undefined) {
            const localSha = await computeGitBlobSha(file.content);
            const remoteSha = remoteMap.get(path);
            if (!remoteSha) {
              added.push(path);
            } else if (localSha !== remoteSha) {
              modified.push(path);
            }
          } else {
            // Binary file: only check presence
            if (!remoteMap.has(path)) {
              added.push(path);
            }
          }
        }

        const deleted = remoteTree
          .filter((e) => !localPaths.has(e.path))
          .map((e) => e.path);

        if (cancelled) return;

        setStatus({
          modified,
          added,
          deleted,
          remoteAhead: remoteAheadRef.current,
          localSha: project!.gitLastCommitSha ?? "",
          remoteSha: remoteShaRef.current,
        });
        setChangeCount(modified.length + added.length + deleted.length);
      } catch {
        if (!cancelled) setError("Failed to compute status");
      }
    }

    compute();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, project?.gitRemoteTree, setChangeCount]);

  // Manual refresh — calls GitHub API to check remoteAhead and populate/update gitRemoteTree
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/github/git/status?projectId=${projectId}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to fetch status");
      } else {
        remoteAheadRef.current = json.remoteAhead ?? false;
        remoteShaRef.current = json.remoteSha ?? "";
        // The API stores gitRemoteTree in Convex, which triggers the reactive effect above
      }
    } catch {
      setError("Network error");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Fetch from GitHub on first activation if no cached tree exists yet
  const prevActive = useRef(false);
  useEffect(() => {
    const becameActive = isActive && !prevActive.current;
    prevActive.current = isActive;
    if (becameActive && !project?.gitRemoteTree) {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, project?.gitRemoteTree]);

  return { data: status, isLoading, error, refresh };
}
