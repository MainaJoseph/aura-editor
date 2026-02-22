"use client";

import { useState } from "react";
import { ChevronDownIcon, GitBranchIcon, PlusIcon, CheckIcon, Loader2Icon } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useGitBranches } from "../hooks/use-git-branches";
import { Id } from "../../../../convex/_generated/dataModel";

interface GitBranchesPopoverProps {
  projectId: Id<"projects">;
  currentBranch: string;
  onBranchSwitch: (branch: string) => void;
}

export const GitBranchesPopover = ({
  projectId,
  currentBranch,
  onBranchSwitch,
}: GitBranchesPopoverProps) => {
  const [open, setOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isSwitching, setIsSwitching] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, refresh } = useGitBranches(projectId, open);

  const handleSwitch = async (branch: string) => {
    if (branch === currentBranch) {
      setOpen(false);
      return;
    }

    setError(null);
    setIsSwitching(branch);
    try {
      const res = await fetch("/api/github/git/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, branchName: branch }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to switch branch");
      } else {
        onBranchSwitch(branch);
        setOpen(false);
      }
    } catch {
      setError("Network error");
    } finally {
      setIsSwitching(null);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;

    setError(null);
    setIsCreating(true);
    try {
      const res = await fetch("/api/github/git/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, branchName: newBranchName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create branch");
      } else {
        setNewBranchName("");
        refresh();
      }
    } catch {
      setError("Network error");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 px-2 py-1 text-xs rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
          <GitBranchIcon className="size-3" />
          <span className="max-w-[120px] truncate">{currentBranch}</span>
          <ChevronDownIcon className="size-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-56 p-1">
        {isLoading && (
          <div className="flex items-center justify-center py-2">
            <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && data?.branches && (
          <div className="max-h-48 overflow-y-auto mb-1">
            {data.branches.map((branch) => (
              <button
                key={branch}
                onClick={() => handleSwitch(branch)}
                disabled={!!isSwitching}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent text-left disabled:opacity-50"
              >
                {isSwitching === branch ? (
                  <Loader2Icon className="size-3 animate-spin shrink-0" />
                ) : branch === currentBranch ? (
                  <CheckIcon className="size-3 shrink-0 text-green-500" />
                ) : (
                  <GitBranchIcon className="size-3 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate">{branch}</span>
              </button>
            ))}
          </div>
        )}

        <div className="border-t pt-1">
          <form onSubmit={handleCreateBranch} className="flex gap-1">
            <input
              type="text"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              placeholder="New branch name..."
              disabled={isCreating}
              className="flex-1 px-2 py-1 text-xs rounded border bg-background focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isCreating || !newBranchName.trim()}
              className="p-1 rounded hover:bg-accent disabled:opacity-50 transition-colors"
              title="Create branch"
            >
              {isCreating ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : (
                <PlusIcon className="size-3.5" />
              )}
            </button>
          </form>
          {error && <p className="text-xs text-destructive mt-1 px-1">{error}</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
};
