"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const OnlineUsers = ({
  projectId,
}: {
  projectId: Id<"projects">;
}) => {
  const presence = useQuery(api.presence.getProjectPresence, { projectId });

  if (!presence || presence.length === 0) return null;

  return (
    <div className="flex items-center -space-x-1.5">
      {presence.slice(0, 5).map((entry) => (
        <Tooltip key={entry._id}>
          <TooltipTrigger asChild>
            <div
              className="size-6 rounded-full flex items-center justify-center text-[10px] font-medium text-white border-2 border-sidebar shrink-0"
              style={{ backgroundColor: entry.userColor }}
            >
              {entry.userName.charAt(0).toUpperCase()}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {entry.userName}
            {entry.fileId && (
              <span className="text-muted-foreground ml-1">(editing)</span>
            )}
          </TooltipContent>
        </Tooltip>
      ))}
      {presence.length > 5 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="size-6 rounded-full flex items-center justify-center text-[10px] font-medium bg-muted text-muted-foreground border-2 border-sidebar shrink-0">
              +{presence.length - 5}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {presence.length - 5} more online
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};
