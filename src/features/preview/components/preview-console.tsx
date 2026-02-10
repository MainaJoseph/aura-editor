"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Trash2Icon, MonitorIcon } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import { ConsoleEntry } from "@/features/preview/store/use-console-store";

type LevelFilter = "all" | "errors" | "warnings";

interface PreviewConsoleProps {
  entries: ConsoleEntry[];
  onClear: () => void;
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });
}

const levelStyles: Record<ConsoleEntry["level"], string> = {
  log: "text-muted-foreground",
  info: "text-blue-400",
  warn: "text-amber-400",
  error: "text-red-400",
  debug: "text-purple-400",
};

const levelBgStyles: Record<ConsoleEntry["level"], string> = {
  log: "bg-muted/50",
  info: "bg-blue-500/10",
  warn: "bg-amber-500/10",
  error: "bg-red-500/10",
  debug: "bg-purple-500/10",
};

export const PreviewConsole = ({ entries, onClear }: PreviewConsoleProps) => {
  const [filter, setFilter] = useState<LevelFilter>("all");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAutoScrollRef = useRef(true);

  const filteredEntries = entries.filter((entry) => {
    if (filter === "all") return true;
    if (filter === "errors") return entry.level === "error";
    if (filter === "warnings")
      return entry.level === "warn" || entry.level === "error";
    return true;
  });

  // Track if user has scrolled up
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    isAutoScrollRef.current = atBottom;
  }, []);

  // Auto-scroll on new entries
  useEffect(() => {
    if (isAutoScrollRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredEntries.length]);

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-sidebar">
      <div className="h-7 flex items-center gap-1 px-2 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-0.5">
          {(["all", "errors", "warnings"] as LevelFilter[]).map((f) => (
            <button
              key={f}
              className={cn(
                "px-2 py-0.5 text-[11px] rounded-sm transition-colors capitalize",
                filter === f
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button
          className="p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          onClick={onClear}
          title="Clear console"
        >
          <Trash2Icon className="size-3" />
        </button>
      </div>

      {filteredEntries.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="flex flex-col items-center gap-2 text-center">
            <MonitorIcon className="size-6" />
            <p className="text-sm">No console output yet</p>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1 min-h-0">
          <div
            ref={scrollRef}
            className="h-full overflow-y-auto"
            onScroll={handleScroll}
          >
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className={cn(
                  "flex items-start gap-2 px-3 py-0.5 text-xs font-mono border-b border-border/20",
                  levelBgStyles[entry.level],
                )}
              >
                <span className="text-muted-foreground shrink-0 text-[10px] pt-px">
                  {formatTimestamp(entry.timestamp)}
                </span>
                <span
                  className={cn(
                    "shrink-0 text-[10px] uppercase font-semibold w-10 pt-px",
                    levelStyles[entry.level],
                  )}
                >
                  {entry.level}
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground/70 pt-px">
                  {entry.source}
                </span>
                <span className="flex-1 min-w-0 whitespace-pre-wrap break-all text-foreground">
                  {entry.args.join(" ")}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
