"use client";

import { TerminalSquareIcon, PlusIcon, MonitorIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface PanelTabsProps {
  activePanel: "terminal" | "console";
  onPanelChange: (panel: "terminal" | "console") => void;
  onCreateTerminal: () => void;
  canCreateTerminal: boolean;
  consoleEntryCount: number;
}

export const PanelTabs = ({
  activePanel,
  onPanelChange,
  onCreateTerminal,
  canCreateTerminal,
  consoleEntryCount,
}: PanelTabsProps) => {
  return (
    <div className="h-7 flex items-center justify-between border-b border-border/50 shrink-0 bg-sidebar">
      <div className="flex items-center">
        <button
          className={cn(
            "h-7 px-3 flex items-center gap-1.5 text-xs transition-colors",
            activePanel === "terminal"
              ? "bg-background text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => onPanelChange("terminal")}
        >
          <TerminalSquareIcon className="size-3" />
          Terminal
        </button>
        <button
          className={cn(
            "h-7 px-3 flex items-center gap-1.5 text-xs transition-colors",
            activePanel === "console"
              ? "bg-background text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => onPanelChange("console")}
        >
          <MonitorIcon className="size-3" />
          Console
          {activePanel !== "console" && consoleEntryCount > 0 && (
            <span className="ml-0.5 px-1.5 py-0.5 text-[10px] leading-none rounded-full bg-muted text-muted-foreground">
              {consoleEntryCount > 99 ? "99+" : consoleEntryCount}
            </span>
          )}
        </button>
      </div>
      {activePanel === "terminal" && (
        <button
          className={cn(
            "p-1 mr-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
            !canCreateTerminal && "opacity-40 pointer-events-none",
          )}
          onClick={onCreateTerminal}
          disabled={!canCreateTerminal}
          title="New Terminal"
        >
          <PlusIcon className="size-3.5" />
        </button>
      )}
    </div>
  );
};
