"use client";

import { useState, useRef, useCallback, useEffect } from "react";

import { ConversationSidebar } from "@/features/conversations/components/conversation-sidebar";

import { Navbar } from "./navbar";
import { Id } from "../../../../convex/_generated/dataModel";

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 800;
const DEFAULT_CONVERSATION_SIDEBAR_WIDTH = 400;

export const ProjectIdLayout = ({
  children,
  projectId,
}: {
  children: React.ReactNode;
  projectId: Id<"projects">;
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_CONVERSATION_SIDEBAR_WIDTH);
  const isDragging = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      const startX = e.clientX;
      const startWidth = sidebarWidth;

      const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging.current) return;
        const newWidth = startWidth + (e.clientX - startX);
        setSidebarWidth(Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, newWidth)));
      };

      const handleMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        cleanupRef.current = null;
      };

      const cleanup = () => {
        isDragging.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      cleanupRef.current = cleanup;
    },
    [sidebarWidth]
  );

  return (
    <div className="w-full h-screen flex flex-col">
      <Navbar projectId={projectId} />
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar — always mounted, never swaps tree position */}
        <div
          className="h-full shrink-0 overflow-hidden"
          style={isCollapsed ? undefined : { width: sidebarWidth }}
        >
          <ConversationSidebar
            projectId={projectId}
            isCollapsed={isCollapsed}
            onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
          />
        </div>
        {/* Drag-to-resize handle, only visible when expanded */}
        {!isCollapsed && (
          <div
            onMouseDown={handleResizeStart}
            className="w-1 h-full shrink-0 cursor-col-resize hover:bg-blue-500/50 active:bg-blue-500/50 transition-colors"
          />
        )}
        {/* Children always at the same tree position — never remounts */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
};
