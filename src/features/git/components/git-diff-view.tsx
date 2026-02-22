"use client";

import { useState, useEffect, useMemo } from "react";
import { XIcon, Loader2Icon, GitBranchIcon } from "lucide-react";

import { Id } from "../../../../convex/_generated/dataModel";

interface GitDiffViewProps {
  projectId: Id<"projects">;
  path: string;
  onClose: () => void;
}

type DiffLineType = "unchanged" | "added" | "removed";

interface DiffLine {
  type: DiffLineType;
  text: string;
  oldNum: number | null;
  newNum: number | null;
}

// Myers LCS-based line diff
function computeLineDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  const m = oldLines.length;
  const n = newLines.length;

  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack
  const raw: { type: "unchanged" | "added" | "removed"; text: string }[] = [];
  let i = m,
    j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      raw.unshift({ type: "unchanged", text: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      raw.unshift({ type: "added", text: newLines[j - 1] });
      j--;
    } else {
      raw.unshift({ type: "removed", text: oldLines[i - 1] });
      i--;
    }
  }

  // Attach line numbers
  const result: DiffLine[] = [];
  let oldNum = 1;
  let newNum = 1;
  for (const line of raw) {
    if (line.type === "unchanged") {
      result.push({ ...line, oldNum, newNum });
      oldNum++;
      newNum++;
    } else if (line.type === "removed") {
      result.push({ ...line, oldNum, newNum: null });
      oldNum++;
    } else {
      result.push({ ...line, oldNum: null, newNum });
      newNum++;
    }
  }
  return result;
}

// Collapse unchanged hunks that are more than CONTEXT lines away from a change
const CONTEXT = 3;

interface Hunk {
  lines: DiffLine[];
  collapsed: boolean;
}

function buildHunks(lines: DiffLine[]): Hunk[] {
  if (lines.length === 0) return [];

  // Mark which lines are "near a change"
  const near = new Array(lines.length).fill(false);
  for (let idx = 0; idx < lines.length; idx++) {
    if (lines[idx].type !== "unchanged") {
      for (let k = Math.max(0, idx - CONTEXT); k <= Math.min(lines.length - 1, idx + CONTEXT); k++) {
        near[k] = true;
      }
    }
  }

  const hunks: Hunk[] = [];
  let currentHunk: DiffLine[] = [];
  let currentNear = near[0];

  for (let idx = 0; idx < lines.length; idx++) {
    if (near[idx] === currentNear) {
      currentHunk.push(lines[idx]);
    } else {
      hunks.push({ lines: currentHunk, collapsed: !currentNear });
      currentHunk = [lines[idx]];
      currentNear = near[idx];
    }
  }
  if (currentHunk.length > 0) {
    hunks.push({ lines: currentHunk, collapsed: !currentNear });
  }
  return hunks;
}

const lineStyles: Record<DiffLineType, string> = {
  added: "bg-green-950/60 text-green-200",
  removed: "bg-red-950/60 text-red-200",
  unchanged: "text-muted-foreground",
};

const gutterStyles: Record<DiffLineType, string> = {
  added: "bg-green-950/40 text-green-700 select-none",
  removed: "bg-red-950/40 text-red-700 select-none",
  unchanged: "bg-muted/30 text-muted-foreground/40 select-none",
};

const prefixChar: Record<DiffLineType, string> = {
  added: "+",
  removed: "-",
  unchanged: " ",
};

export const GitDiffView = ({ projectId, path, onClose }: GitDiffViewProps) => {
  const [oldContent, setOldContent] = useState<string | null>(null);
  const [newContent, setNewContent] = useState<string | null>(null);
  const [status, setStatus] = useState<"M" | "A" | "D">("M");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    fetch(`/api/github/git/diff?projectId=${projectId}&path=${encodeURIComponent(path)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setOldContent(data.oldContent);
          setNewContent(data.newContent);
          setStatus(data.status);
        }
      })
      .catch(() => setError("Network error"))
      .finally(() => setIsLoading(false));
  }, [projectId, path]);

  const diffLines = useMemo(() => {
    if (status === "A") {
      // Entirely new file — all lines are added
      const lines = (newContent ?? "").split("\n");
      return lines.map((text, idx) => ({
        type: "added" as DiffLineType,
        text,
        oldNum: null,
        newNum: idx + 1,
      }));
    }
    if (status === "D") {
      // Deleted file — all lines are removed
      const lines = (oldContent ?? "").split("\n");
      return lines.map((text, idx) => ({
        type: "removed" as DiffLineType,
        text,
        oldNum: idx + 1,
        newNum: null,
      }));
    }
    return computeLineDiff(
      (oldContent ?? "").split("\n"),
      (newContent ?? "").split("\n"),
    );
  }, [oldContent, newContent, status]);

  const [hunks, setHunks] = useState<Hunk[]>([]);

  useEffect(() => {
    setHunks(buildHunks(diffLines));
  }, [diffLines]);

  const toggleHunk = (idx: number) => {
    setHunks((prev) =>
      prev.map((h, i) => (i === idx ? { ...h, collapsed: !h.collapsed } : h)),
    );
  };

  const filename = path.split("/").pop() ?? path;
  const dir = path.includes("/") ? path.substring(0, path.lastIndexOf("/")) : null;

  const statusLabel = { M: "Modified", A: "Added", D: "Deleted" }[status];
  const statusColor = { M: "text-yellow-500", A: "text-green-500", D: "text-red-500" }[status];

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-sidebar shrink-0">
        <GitBranchIcon className="size-3.5 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium flex-1 truncate">
          {filename}
          {dir && <span className="text-muted-foreground font-normal ml-1 text-xs">({dir})</span>}
        </span>
        <span className={`text-xs font-bold ${statusColor}`}>{statusLabel}</span>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors ml-1"
          title="Close diff (Esc)"
        >
          <XIcon className="size-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto font-mono text-xs">
        {isLoading && (
          <div className="flex items-center justify-center h-24">
            <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="px-4 py-4 text-destructive text-sm">{error}</div>
        )}

        {!isLoading && !error && (
          <table className="w-full border-collapse">
            <tbody>
              {hunks.map((hunk, hunkIdx) => {
                if (hunk.collapsed) {
                  const firstOld = hunk.lines.find((l) => l.oldNum !== null)?.oldNum;
                  const lastOld = [...hunk.lines].reverse().find((l) => l.oldNum !== null)?.oldNum;
                  return (
                    <tr
                      key={`hunk-${hunkIdx}`}
                      className="cursor-pointer hover:bg-accent/30"
                      onClick={() => toggleHunk(hunkIdx)}
                    >
                      <td colSpan={4} className="py-1 px-4 text-muted-foreground/60 text-xs select-none bg-muted/20 border-y border-border/30">
                        ↕ {hunk.lines.length} unchanged lines
                        {firstOld && lastOld && ` (lines ${firstOld}–${lastOld})`}
                        {" "}— click to expand
                      </td>
                    </tr>
                  );
                }

                return hunk.lines.map((line, lineIdx) => (
                  <tr key={`${hunkIdx}-${lineIdx}`} className={`${lineStyles[line.type]} group`}>
                    {/* Old line number */}
                    <td className={`w-10 text-right pr-2 pl-1 py-px border-r border-border/20 ${gutterStyles[line.type]}`}>
                      {line.oldNum ?? ""}
                    </td>
                    {/* New line number */}
                    <td className={`w-10 text-right pr-2 pl-1 py-px border-r border-border/20 ${gutterStyles[line.type]}`}>
                      {line.newNum ?? ""}
                    </td>
                    {/* Prefix (+/-/ ) */}
                    <td className={`w-5 text-center py-px border-r border-border/20 font-bold ${gutterStyles[line.type]}`}>
                      {prefixChar[line.type]}
                    </td>
                    {/* Line content */}
                    <td className="py-px pl-3 pr-4 whitespace-pre">
                      {line.text || " "}
                    </td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
