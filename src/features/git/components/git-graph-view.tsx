"use client";

import { useMemo } from "react";
import { RefreshCwIcon, Loader2Icon, GitCommitHorizontalIcon } from "lucide-react";

import { Id } from "../../../../convex/_generated/dataModel";
import { useGitCommits } from "../hooks/use-git-commits";
import type { CommitInfo, BranchRef } from "../../../app/api/github/git/commits/route";

// ─── Layout constants ────────────────────────────────────────────────────────
const ROW_HEIGHT = 32;
const HALF = ROW_HEIGHT / 2;
const LANE_WIDTH = 14;
const DOT_R = 4;
const GRAPH_PAD = 6;
const STROKE = 1.5;

const LANE_COLORS = [
  "#4FC1FF",
  "#7EE787",
  "#D2A8FF",
  "#FF7B72",
  "#FFA657",
  "#F97583",
  "#79C0FF",
  "#56D364",
];

function laneX(lane: number) {
  return GRAPH_PAD + lane * LANE_WIDTH + LANE_WIDTH / 2;
}

// ─── Graph algorithm ─────────────────────────────────────────────────────────
interface LaneState {
  sha: string;
  color: string;
}

interface GraphRow {
  sha: string;
  message: string;
  author: string;
  date: string;
  parents: string[];
  branchRefs: { name: string; isCurrent: boolean }[];
  isHead: boolean;
  // layout
  lane: number;
  color: string;
  lanesBefore: (LaneState | null)[];
  lanesAfter: (LaneState | null)[];
  edges: { fromLane: number; toLane: number; color: string }[];
}

function buildGraphRows(
  commits: CommitInfo[],
  branches: BranchRef[],
  currentSha: string | null,
): GraphRow[] {
  const lanes: (LaneState | null)[] = [];
  let colorIdx = 0;
  const getColor = () => LANE_COLORS[colorIdx++ % LANE_COLORS.length];

  const branchMap = new Map<string, { name: string; isCurrent: boolean }[]>();
  for (const b of branches) {
    if (!branchMap.has(b.sha)) branchMap.set(b.sha, []);
    branchMap.get(b.sha)!.push({ name: b.name, isCurrent: b.isCurrent });
  }

  return commits.map((commit) => {
    // Snapshot BEFORE we touch lanes
    const lanesBefore: (LaneState | null)[] = lanes.map((l) => (l ? { ...l } : null));

    // Find or allocate lane
    let myLane = lanes.findIndex((l) => l?.sha === commit.sha);
    let myColor: string;

    if (myLane === -1) {
      myLane = lanes.findIndex((l) => l === null);
      if (myLane === -1) {
        myLane = lanes.length;
        lanes.push(null);
      }
      myColor = getColor();
    } else {
      myColor = lanes[myLane]!.color;
    }

    // Clear this lane
    lanes[myLane] = null;

    // Assign parents to lanes and build edges
    const edges: GraphRow["edges"] = [];

    for (let i = 0; i < commit.parents.length; i++) {
      const parentSha = commit.parents[i];
      const existingLane = lanes.findIndex((l) => l?.sha === parentSha);

      if (existingLane !== -1) {
        // Parent already tracked — merge toward that lane
        edges.push({ fromLane: myLane, toLane: existingLane, color: lanes[existingLane]!.color });
      } else {
        // Assign parent to a lane
        let targetLane: number;
        if (i === 0) {
          targetLane = myLane; // first parent reuses our lane
        } else {
          targetLane = lanes.findIndex((l) => l === null);
          if (targetLane === -1) {
            targetLane = lanes.length;
            lanes.push(null);
          }
        }
        const edgeColor = i === 0 ? myColor : getColor();
        lanes[targetLane] = { sha: parentSha, color: edgeColor };
        edges.push({ fromLane: myLane, toLane: targetLane, color: edgeColor });
      }
    }

    const lanesAfter: (LaneState | null)[] = lanes.map((l) => (l ? { ...l } : null));

    return {
      sha: commit.sha,
      message: commit.message,
      author: commit.author,
      date: commit.date,
      parents: commit.parents,
      branchRefs: branchMap.get(commit.sha) ?? [],
      isHead: commit.sha === currentSha,
      lane: myLane,
      color: myColor,
      lanesBefore,
      lanesAfter,
      edges,
    };
  });
}

// ─── SVG paths for one row ───────────────────────────────────────────────────
function RowSvg({ row, svgWidth }: { row: GraphRow; svgWidth: number }) {
  const elements: React.ReactNode[] = [];
  let k = 0;

  // Part A — top half (y: 0 → HALF): incoming lines
  for (let i = 0; i < row.lanesBefore.length; i++) {
    const lane = row.lanesBefore[i];
    if (!lane) continue;

    const x1 = laneX(i);
    const isCommit = lane.sha === row.sha;
    const x2 = isCommit ? laneX(row.lane) : x1;

    if (x1 === x2) {
      elements.push(
        <line key={k++} x1={x1} y1={0} x2={x2} y2={HALF} stroke={lane.color} strokeWidth={STROKE} />,
      );
    } else {
      elements.push(
        <path
          key={k++}
          d={`M${x1},0 C${x1},${HALF} ${x2},0 ${x2},${HALF}`}
          stroke={lane.color}
          strokeWidth={STROKE}
          fill="none"
        />,
      );
    }
  }

  // Commit dot
  if (row.isHead) {
    // HEAD: outlined circle with filled inner dot
    elements.push(
      <circle key="dot-outer" cx={laneX(row.lane)} cy={HALF} r={DOT_R + 1} fill="none" stroke={row.color} strokeWidth={1.5} />,
    );
    elements.push(
      <circle key="dot-inner" cx={laneX(row.lane)} cy={HALF} r={DOT_R - 1} fill={row.color} />,
    );
  } else {
    elements.push(
      <circle key="dot" cx={laneX(row.lane)} cy={HALF} r={DOT_R} fill={row.color} />,
    );
  }

  // Part B — bottom half (y: HALF → ROW_HEIGHT): outgoing edges
  for (const edge of row.edges) {
    const x1 = laneX(edge.fromLane);
    const x2 = laneX(edge.toLane);

    if (x1 === x2) {
      elements.push(
        <line key={k++} x1={x1} y1={HALF} x2={x2} y2={ROW_HEIGHT} stroke={edge.color} strokeWidth={STROKE} />,
      );
    } else {
      elements.push(
        <path
          key={k++}
          d={`M${x1},${HALF} C${x1},${ROW_HEIGHT} ${x2},${HALF} ${x2},${ROW_HEIGHT}`}
          stroke={edge.color}
          strokeWidth={STROKE}
          fill="none"
        />,
      );
    }
  }

  // Through-lines (bottom half): lanes that were active before and continue unchanged
  for (let i = 0; i < row.lanesAfter.length; i++) {
    const after = row.lanesAfter[i];
    if (!after || i === row.lane) continue;
    const before = row.lanesBefore[i];
    if (before && before.sha === after.sha) {
      const x = laneX(i);
      elements.push(
        <line key={k++} x1={x} y1={HALF} x2={x} y2={ROW_HEIGHT} stroke={after.color} strokeWidth={STROKE} />,
      );
    }
  }

  return (
    <svg
      width={svgWidth}
      height={ROW_HEIGHT}
      style={{ flexShrink: 0, display: "block" }}
    >
      {elements}
    </svg>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

// ─── Main component ───────────────────────────────────────────────────────────
interface GitGraphViewProps {
  projectId: Id<"projects">;
  isActive?: boolean;
}

export const GitGraphView = ({ projectId, isActive = false }: GitGraphViewProps) => {
  const { data, isLoading, error, refresh } = useGitCommits(projectId, isActive);

  const rows = useMemo(() => {
    if (!data) return [];
    return buildGraphRows(data.commits, data.branches, data.currentSha);
  }, [data]);

  const svgWidth = useMemo(() => {
    if (rows.length === 0) return GRAPH_PAD * 2 + LANE_WIDTH;
    const maxLane = rows.reduce((max, row) => {
      const rowMax = Math.max(
        row.lane,
        row.lanesBefore.length > 0 ? row.lanesBefore.length - 1 : 0,
        row.lanesAfter.length > 0 ? row.lanesAfter.length - 1 : 0,
      );
      return Math.max(max, rowMax);
    }, 0);
    return GRAPH_PAD + (maxLane + 1) * LANE_WIDTH + GRAPH_PAD / 2;
  }, [rows]);

  // ── Loading ──
  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-24">
        <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="px-4 py-4 text-xs text-destructive">{error}</div>
    );
  }

  // ── Empty ──
  if (!data || data.commits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-24 gap-2 text-muted-foreground">
        <GitCommitHorizontalIcon className="size-5" />
        <span className="text-xs">No commits yet</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b shrink-0">
        <span className="text-xs text-muted-foreground">{data.commits.length} commits</span>
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

      {/* Graph rows */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {rows.map((row) => (
          <CommitRow key={row.sha} row={row} svgWidth={svgWidth} />
        ))}
      </div>
    </div>
  );
};

// ─── Single commit row ────────────────────────────────────────────────────────
function CommitRow({ row, svgWidth }: { row: GraphRow; svgWidth: number }) {
  const shortSha = row.sha.slice(0, 7);

  return (
    <div
      className="flex items-center gap-2 pr-3 hover:bg-accent/40 transition-colors group"
      style={{ height: ROW_HEIGHT }}
      title={`${row.sha}\n${row.message}\n${row.author}`}
    >
      {/* Graph SVG */}
      <RowSvg row={row} svgWidth={svgWidth} />

      {/* Branch/tag badges */}
      {row.branchRefs.length > 0 && (
        <div className="flex items-center gap-1 shrink-0">
          {row.branchRefs.slice(0, 2).map((b) => (
            <span
              key={b.name}
              className="px-1.5 py-px text-[10px] rounded font-medium leading-none"
              style={{
                background: b.isCurrent ? "#4FC1FF22" : "#7EE78722",
                color: b.isCurrent ? "#4FC1FF" : "#7EE787",
                border: `1px solid ${b.isCurrent ? "#4FC1FF55" : "#7EE78755"}`,
              }}
            >
              {b.name}
            </span>
          ))}
          {row.branchRefs.length > 2 && (
            <span className="text-[10px] text-muted-foreground">+{row.branchRefs.length - 2}</span>
          )}
        </div>
      )}

      {/* Commit message */}
      <span className="flex-1 text-xs truncate min-w-0">{row.message}</span>

      {/* Short SHA */}
      <span className="text-[10px] font-mono text-muted-foreground shrink-0 hidden group-hover:inline">
        {shortSha}
      </span>

      {/* Author */}
      <span className="text-[10px] text-muted-foreground shrink-0 max-w-[60px] truncate hidden sm:block">
        {row.author.split(" ")[0]}
      </span>

      {/* Date */}
      <span className="text-[10px] text-muted-foreground shrink-0 w-[48px] text-right">
        {row.date ? formatRelativeDate(row.date) : ""}
      </span>
    </div>
  );
}
