"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { PlusIcon, XIcon, TerminalSquareIcon } from "lucide-react";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import { TerminalInstance } from "@/features/preview/store/use-terminal-store";

interface TerminalTabsProps {
  terminals: TerminalInstance[];
  activeTerminalId: string | null;
  onSelect: (terminalId: string) => void;
  onClose: (terminalId: string) => void;
  onRename: (terminalId: string, label: string) => void;
  onCreateTerminal: () => void;
  canCreate: boolean;
}

export const TerminalTabs = ({
  terminals,
  activeTerminalId,
  onSelect,
  onClose,
  onRename,
  onCreateTerminal,
  canCreate,
}: TerminalTabsProps) => {
  return (
    <div className="w-32 flex flex-col border-l border-border/50 bg-sidebar shrink-0">
      <div className="h-7 flex items-center justify-end px-1.5 border-b border-border/50 shrink-0">
        <button
          className={cn(
            "p-1 rounded-sm flex items-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
            !canCreate && "opacity-40 pointer-events-none",
          )}
          onClick={onCreateTerminal}
          disabled={!canCreate}
          title="New Terminal"
        >
          <PlusIcon className="size-3.5" />
        </button>
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col">
          {terminals.map((terminal) => (
            <TerminalTab
              key={terminal.id}
              terminal={terminal}
              isActive={terminal.id === activeTerminalId}
              onSelect={() => onSelect(terminal.id)}
              onClose={() => onClose(terminal.id)}
              onRename={(label) => onRename(terminal.id, label)}
              onCreateTerminal={onCreateTerminal}
              canCreate={canCreate}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

interface TerminalTabProps {
  terminal: TerminalInstance;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
  onRename: (label: string) => void;
  onCreateTerminal: () => void;
  canCreate: boolean;
}

const TerminalTab = ({
  terminal,
  isActive,
  onSelect,
  onClose,
  onRename,
  onCreateTerminal,
  canCreate,
}: TerminalTabProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(terminal.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const commitRename = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== terminal.label) {
      onRename(trimmed);
    }
    setIsEditing(false);
  }, [editValue, terminal.label, onRename]);

  const startRename = useCallback(() => {
    setEditValue(terminal.label);
    setIsEditing(true);
  }, [terminal.label]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      commitRename();
    } else if (e.key === "Escape") {
      setIsEditing(false);
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            "group flex items-center gap-1.5 px-2 py-1 text-xs cursor-pointer select-none min-w-0",
            isActive
              ? "bg-background text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
            terminal.status === "exited" && "opacity-60",
          )}
          onClick={onSelect}
        >
          <TerminalSquareIcon className="size-3 shrink-0" />
          {isEditing ? (
            <input
              ref={inputRef}
              className="bg-transparent border-none outline-none text-xs flex-1 min-w-0 p-0"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="truncate flex-1 min-w-0">
              {terminal.label}
            </span>
          )}
          <button
            className={cn(
              "shrink-0 p-0.5 rounded-sm hover:bg-accent text-muted-foreground hover:text-foreground transition-colors",
              isActive ? "visible" : "invisible group-hover:visible",
            )}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            title="Kill Terminal"
          >
            <XIcon className="size-3" />
          </button>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem
          onClick={onCreateTerminal}
          disabled={!canCreate}
        >
          New Terminal
          <ContextMenuShortcut>Ctrl+Shift+`</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={startRename}>
          Rename...
          <ContextMenuShortcut>F2</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          variant="destructive"
          onClick={onClose}
        >
          Kill Terminal
          <ContextMenuShortcut>Delete</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
