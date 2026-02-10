"use client";

import { FilesIcon, SearchIcon, GitBranchIcon, SettingsIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ActivityBarProps {
  activePanel: string | null;
  onPanelToggle: (panel: string) => void;
}

const topItems = [
  { id: "explorer", icon: FilesIcon, label: "Explorer" },
  { id: "search", icon: SearchIcon, label: "Search" },
  { id: "source-control", icon: GitBranchIcon, label: "Source Control" },
];

const bottomItems = [
  { id: "settings", icon: SettingsIcon, label: "Settings" },
];

export const ActivityBar = ({ activePanel, onPanelToggle }: ActivityBarProps) => {
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
        {bottomItems.map((item) => (
          <Tooltip key={item.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onPanelToggle(item.id)}
                className="w-full flex items-center justify-center h-12 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              >
                <item.icon className="size-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={4}>
              {item.label}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
};
