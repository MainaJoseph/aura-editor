"use client";

import { useState } from "react";
import {
  FilesIcon,
  SearchIcon,
  GitBranchIcon,
  SettingsIcon,
  PaletteIcon,
  UserIcon,
  KeyboardIcon,
  BracesIcon,
  ListTodoIcon,
  SunMoonIcon,
  BlocksIcon,
  CheckIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ActivityBarProps {
  activePanel: string | null;
  onPanelToggle: (panel: string) => void;
  sidebarWidth: number;
}

const topItems = [
  { id: "explorer", icon: FilesIcon, label: "Explorer" },
  { id: "search", icon: SearchIcon, label: "Search" },
  { id: "source-control", icon: GitBranchIcon, label: "Source Control" },
  { id: "extensions", icon: BlocksIcon, label: "Extensions" },
];

const settingsMenuItems = [
  { id: "command-palette", icon: PaletteIcon, label: "Command Palette...", shortcut: "Ctrl+Shift+P" },
  { id: "profiles", icon: UserIcon, label: "Profiles" },
  { id: "settings", icon: SettingsIcon, label: "Settings", shortcut: "Ctrl+," },
  { id: "extensions", icon: BlocksIcon, label: "Extensions", shortcut: "Ctrl+Shift+X" },
  { id: "keyboard-shortcuts", icon: KeyboardIcon, label: "Keyboard Shortcuts", shortcut: "Ctrl+K Ctrl+S" },
  { id: "snippets", icon: BracesIcon, label: "Snippets" },
  { id: "tasks", icon: ListTodoIcon, label: "Tasks" },
  { id: "themes", icon: SunMoonIcon, label: "Themes" },
];

export const ActivityBar = ({ activePanel, onPanelToggle, sidebarWidth }: ActivityBarProps) => {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="w-12 h-full bg-sidebar border-r flex flex-col justify-between">
      <div className="flex flex-col items-center">
        {topItems.map((item) => {
          const isActive = activePanel === item.id;
          return (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onPanelToggle(item.id)}
                  className={cn(
                    "w-full flex items-center justify-center h-12 text-muted-foreground/60 hover:text-muted-foreground transition-colors",
                    isActive && "text-foreground border-l-2 border-foreground"
                  )}
                >
                  <item.icon className="size-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={4}>
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      <div className="flex flex-col items-center pb-2">
        <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button
                  className="w-full flex items-center justify-center h-12 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                >
                  <SettingsIcon className="size-5" />
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            {!settingsOpen && (
              <TooltipContent side="right" sideOffset={4}>
                Settings
              </TooltipContent>
            )}
          </Tooltip>
          <PopoverContent
            side="right"
            align="end"
            sideOffset={4}
            className="p-1"
            style={{ width: sidebarWidth }}
          >
            {settingsMenuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setSettingsOpen(false)}
                className="w-full flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-sm hover:bg-accent text-left cursor-pointer"
              >
                <item.icon className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1">{item.label}</span>
                {item.shortcut && (
                  <span className="text-xs text-muted-foreground">{item.shortcut}</span>
                )}
              </button>
            ))}
            <div className="my-1 h-px bg-border" />
            <button
              onClick={() => setSettingsOpen(false)}
              className="w-full flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-sm hover:bg-accent text-left cursor-pointer"
            >
              <CheckIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex-1">Settings Sync is On</span>
            </button>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
