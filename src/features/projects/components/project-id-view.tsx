"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Allotment } from "allotment";
import { FaGithub } from "react-icons/fa";
import { Trash2Icon, Loader2Icon, SearchIcon } from "lucide-react";
import { useMutation } from "convex/react";

import { cn } from "@/lib/utils";
import { SplitEditorView } from "@/features/editor/components/split-editor-view";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { FileExplorer } from "./file-explorer";
import { ActivityBar } from "./activity-bar";
import { SearchPanel } from "./search-panel";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { PreviewView } from "./preview-view";
import { ExportPopover } from "./export-popover";
import { FileFinderDialog } from "./file-finder-dialog";

const DEFAULT_SIDEBAR_WIDTH = 260;
const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 400;

const Tab = ({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 h-full px-3 cursor-pointer text-muted-foreground border-r hover:bg-accent/30",
        isActive && "bg-background text-foreground"
      )}
    >
      <span className="text-sm">{label}</span>
    </div>
  );
};

export const ProjectIdView = ({ projectId }: { projectId: Id<"projects"> }) => {
  const router = useRouter();
  const [activeView, setActiveView] = useState<"editor" | "preview">("editor");
  const [activePanel, setActivePanel] = useState<"explorer" | "search" | null>(
    "explorer"
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [fileFinderOpen, setFileFinderOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const isDragging = useRef(false);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
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
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [sidebarWidth]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "p") {
        e.preventDefault();
        setFileFinderOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handlePanelToggle = (panel: string) => {
    if (panel === "explorer" || panel === "search") {
      setActivePanel((current) => (current === panel ? null : panel));
    }
  };

  const deleteProject = useMutation(api.projects.deleteProject);

  const handleDeleteProject = async () => {
    try {
      setIsDeleting(true);
      await deleteProject({ id: projectId });
      router.push("/");
    } catch (error) {
      console.error("Failed to delete project:", error);
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <nav className="h-8.75 flex items-center bg-sidebar border-b">
        <Tab
          label="Code"
          isActive={activeView === "editor"}
          onClick={() => setActiveView("editor")}
        />
        <Tab
          label="Preview"
          isActive={activeView === "preview"}
          onClick={() => setActiveView("preview")}
        />
        <div className="flex-1 flex items-center h-full">
          {activeView === "editor" && (
            <div className="flex-1 flex justify-center px-4 relative">
              <button
                onClick={() => setFileFinderOpen(true)}
                className="flex items-center gap-2 w-full max-w-md h-5.5 px-2.5 rounded-md bg-background/50 border border-border/50 text-muted-foreground text-xs hover:bg-accent/30 hover:border-border transition-colors cursor-pointer"
              >
                <SearchIcon className="size-3 shrink-0" />
                <span className="truncate">Search files...</span>
              </button>
              <FileFinderDialog
                projectId={projectId}
                open={fileFinderOpen}
                onOpenChange={setFileFinderOpen}
              />
            </div>
          )}
          {activeView === "preview" && <div className="flex-1" />}
          <div className="flex items-center h-full">
            <ExportPopover projectId={projectId} />
          </div>
          <AlertDialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
          >
            <AlertDialogTrigger asChild>
              <div className="flex items-center gap-1.5 h-full px-3 cursor-pointer text-muted-foreground border-l hover:bg-destructive/10 hover:text-destructive">
                <Trash2Icon className="size-3.5" />
              </div>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Project</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this project? This action
                  cannot be undone. All files, conversations, and messages
                  associated with this project will be permanently deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteProject}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? (
                    <>
                      <Loader2Icon className="size-4 animate-spin mr-2" />
                      Deleting...
                    </>
                  ) : (
                    "Delete Project"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </nav>
      <div className="flex-1 relative">
        <div
          className={cn(
            "absolute inset-0 flex",
            activeView === "editor" ? "visible" : "invisible",
          )}
        >
          <ActivityBar
            activePanel={activePanel}
            onPanelToggle={handlePanelToggle}
            sidebarWidth={sidebarWidth}
          />
          <div className="flex-1 flex overflow-hidden">
            {/* Keep panels mounted to avoid refetching on toggle */}
            <div
              className={cn(
                "h-full shrink-0 overflow-hidden",
                !activePanel && "w-0"
              )}
              style={{ width: activePanel ? sidebarWidth : 0 }}
            >
              <div className="h-full" style={{ width: sidebarWidth }}>
                <div
                  className={cn(
                    "h-full",
                    activePanel !== "explorer" && "hidden"
                  )}
                >
                  <FileExplorer projectId={projectId} />
                </div>
                <div
                  className={cn(
                    "h-full",
                    activePanel !== "search" && "hidden"
                  )}
                >
                  <SearchPanel projectId={projectId} />
                </div>
              </div>
            </div>
            {activePanel && (
              <div
                onMouseDown={handleResizeStart}
                className="w-1 h-full shrink-0 cursor-col-resize hover:bg-blue-500/50 active:bg-blue-500/50 transition-colors"
              />
            )}
            <div className="flex-1 min-w-0">
              <Allotment>
                <Allotment.Pane>
                  <SplitEditorView projectId={projectId} />
                </Allotment.Pane>
              </Allotment>
            </div>
          </div>
        </div>
        <div
          className={cn(
            "absolute inset-0",
            activeView === "preview" ? "visible" : "invisible",
          )}
        >
          <PreviewView projectId={projectId} />
        </div>
      </div>
    </div>
  );
};
