"use client";

import { cn } from "@/lib/utils";

type FileStatus = "M" | "A" | "D";

interface GitFileItemProps {
  path: string;
  status: FileStatus;
  staged: boolean;
  selected: boolean;
  onToggle: (path: string) => void;
  onOpenDiff: (path: string) => void;
}

const statusColors: Record<FileStatus, string> = {
  M: "text-yellow-500",
  A: "text-green-500",
  D: "text-red-500",
};

const statusLabels: Record<FileStatus, string> = {
  M: "Modified",
  A: "Added",
  D: "Deleted",
};

export const GitFileItem = ({
  path,
  status,
  staged,
  selected,
  onToggle,
  onOpenDiff,
}: GitFileItemProps) => {
  const filename = path.split("/").pop() ?? path;
  const dir = path.includes("/") ? path.substring(0, path.lastIndexOf("/")) : null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1 hover:bg-accent/50 cursor-pointer group",
        selected && "bg-accent/70"
      )}
      onClick={() => onOpenDiff(path)}
    >
      {/* Checkbox only toggles staged — does not open diff */}
      <input
        type="checkbox"
        checked={staged}
        onChange={() => onToggle(path)}
        onClick={(e) => e.stopPropagation()}
        className="shrink-0 cursor-pointer"
      />
      <span className="flex-1 min-w-0">
        <span className="text-sm truncate block">{filename}</span>
        {dir && (
          <span className="text-xs text-muted-foreground truncate block">{dir}</span>
        )}
      </span>
      <span
        className={cn("text-xs font-bold shrink-0", statusColors[status])}
        title={statusLabels[status]}
      >
        {status}
      </span>
    </div>
  );
};
