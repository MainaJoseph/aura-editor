"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Allotment } from "allotment";
import { Trash2Icon, Loader2Icon, SearchIcon, UsersIcon } from "lucide-react";
import { RiGitForkLine } from "react-icons/ri";
import { useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { SplitEditorView } from "@/features/editor/components/split-editor-view";
import { useEditorStore, ExtensionTabData } from "@/features/editor/store/use-editor-store";
import { EditorTerminalPanel } from "@/features/editor/components/editor-terminal-panel";
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

import { useProject, useForkProject, useForkCount, useMyForkOf } from "../hooks/use-projects";
import { FileExplorer } from "./file-explorer";
import { ActivityBar } from "./activity-bar";
import { GitPanel } from "@/features/git/components/git-panel";
import { GitDiffView } from "@/features/git/components/git-diff-view";
import { SearchPanel } from "./search-panel";
import { ExtensionsPanel } from "@/features/extensions/components/extensions-panel";
import { useGitStore } from "@/features/git/store/use-git-store";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { PreviewView } from "./preview-view";
import { ExportPopover } from "./export-popover";
import { ShareDialog } from "./share-dialog";
import { FileFinderDialog } from "./file-finder-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  const { user } = useUser();
  const project = useProject(projectId);
  const isOwner = !!user && !!project && project.ownerId === user.id;
  const [activeView, setActiveView] = useState<"editor" | "preview">("editor");
  const [activePanel, setActivePanel] = useState<"explorer" | "search" | "extensions" | "git" | null>(
    "explorer"
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isForkDialogOpen, setIsForkDialogOpen] = useState(false);
  const [isAlreadyForkedDialogOpen, setIsAlreadyForkedDialogOpen] = useState(false);
  const [isForking, setIsForking] = useState(false);
  const forkProject = useForkProject();
  const forkCount = useForkCount(projectId);
  const myExistingForkId = useMyForkOf(projectId);
  const [fileFinderOpen, setFileFinderOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const openExtensionTab = useEditorStore((s) => s.openExtensionTab);
  const showTerminalPanel = useEditorStore(
    (s) => s.getProjectState(projectId).showTerminalPanel
  );
  const toggleTerminalPanel = useEditorStore((s) => s.toggleTerminalPanel);
  const isDragging = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Git store
  const gitChangeCount = useGitStore((s) => s.changeCount);
  const diffPath = useGitStore((s) => s.diffPath);
  const setDiffPath = useGitStore((s) => s.setDiffPath);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

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
  }, [sidebarWidth]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "p") {
        e.preventDefault();
        setFileFinderOpen(true);
      }
      if (e.key === "Escape" && diffPath) {
        setDiffPath(null);
      }
      if (
        activeView === "editor" &&
        e.key === "`" &&
        (e.ctrlKey || e.metaKey) &&
        !e.shiftKey &&
        !e.altKey
      ) {
        e.preventDefault();
        toggleTerminalPanel(projectId);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeView, projectId, toggleTerminalPanel, diffPath, setDiffPath]);

  const handlePanelToggle = (panel: string) => {
    if (panel === "explorer" || panel === "search" || panel === "extensions" || panel === "git") {
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

  const handleForkProject = async () => {
    try {
      setIsForking(true);
      const result = await forkProject({ sourceProjectId: projectId });
      router.push(`/projects/${result.projectId}`);
    } catch {
      toast.error("Failed to fork project");
      setIsForking(false);
      setIsForkDialogOpen(false);
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
            {project?.isDemo && (
              <span className="text-[10px] bg-green-500/10 border border-green-500/30 rounded-sm px-1.5 py-0.5 text-green-600 dark:text-green-400 mx-2">
                Demo Project
              </span>
            )}
            {isOwner && !!forkCount && forkCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 h-full px-3 text-muted-foreground border-l text-xs">
                    <RiGitForkLine className="size-3.5" />
                    <span>{forkCount}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {forkCount} {forkCount === 1 ? "fork" : "forks"} of this project
                </TooltipContent>
              </Tooltip>
            )}
            {isOwner && (
              <>
                <ShareDialog projectId={projectId}>
                  <button className="flex items-center gap-1.5 h-full px-3 cursor-pointer text-muted-foreground border-l hover:bg-accent/30">
                    <UsersIcon className="size-3.5" />
                    <span className="text-sm">Share</span>
                  </button>
                </ShareDialog>
                <ExportPopover projectId={projectId} />
              </>
            )}
            {!isOwner && (
              <>
                <button
                  onClick={() => {
                    if (myExistingForkId) {
                      setIsAlreadyForkedDialogOpen(true);
                    } else {
                      setIsForkDialogOpen(true);
                    }
                  }}
                  disabled={myExistingForkId === undefined}
                  className="flex items-center gap-1.5 h-full px-3 cursor-pointer text-muted-foreground border-l hover:bg-accent/30 disabled:opacity-50 disabled:cursor-default"
                >
                  <RiGitForkLine className="size-3.5" />
                  <span className="text-sm">Fork</span>
                </button>
                {/* Fork confirmation dialog */}
                <AlertDialog open={isForkDialogOpen} onOpenChange={setIsForkDialogOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Fork this project?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will create an independent copy of this project in your account.
                        You can edit it freely without affecting the original.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isForking}>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleForkProject} disabled={isForking}>
                        {isForking ? (
                          <>
                            <Loader2Icon className="size-4 animate-spin mr-2" />
                            Forking...
                          </>
                        ) : (
                          "Fork Project"
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                {/* Already forked dialog */}
                <AlertDialog
                  open={isAlreadyForkedDialogOpen}
                  onOpenChange={setIsAlreadyForkedDialogOpen}
                >
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Already forked</AlertDialogTitle>
                      <AlertDialogDescription>
                        You already have a fork of this project. Would you like to go to your existing fork?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>No, stay here</AlertDialogCancel>
                      <AlertDialogAction onClick={() => router.push(`/projects/${myExistingForkId}`)}>
                        Yes, go to my fork
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
          {isOwner && (
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
          )}
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
            gitChangeCount={gitChangeCount}
            isOwner={isOwner}
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
                <div
                  className={cn(
                    "h-full",
                    activePanel !== "extensions" && "hidden"
                  )}
                >
                  <ExtensionsPanel
                    projectId={projectId}
                    onSelectExtension={(ext) =>
                      openExtensionTab(projectId, ext as unknown as ExtensionTabData)
                    }
                  />
                </div>
                {isOwner && (
                  <div
                    className={cn(
                      "h-full",
                      activePanel !== "git" && "hidden"
                    )}
                  >
                    <GitPanel projectId={projectId} isActive={activePanel === "git"} />
                  </div>
                )}
              </div>
            </div>
            {activePanel && (
              <div
                onMouseDown={handleResizeStart}
                className="w-px h-full shrink-0 cursor-col-resize bg-border hover:bg-blue-500/50 active:bg-blue-500/50 transition-colors"
              />
            )}
            <div className="flex-1 min-w-0 min-h-0 flex flex-col">
              {/* Show diff view when a git file is selected, otherwise show normal editor */}
              {isOwner && diffPath && activePanel === "git" ? (
                <GitDiffView
                  projectId={projectId}
                  path={diffPath}
                  onClose={() => setDiffPath(null)}
                />
              ) : (
                <Allotment vertical>
                  <Allotment.Pane>
                    <SplitEditorView projectId={projectId} />
                  </Allotment.Pane>
                  <Allotment.Pane
                    visible={showTerminalPanel}
                    minSize={100}
                    maxSize={500}
                    preferredSize={200}
                  >
                    <EditorTerminalPanel projectId={projectId} />
                  </Allotment.Pane>
                </Allotment>
              )}
            </div>
          </div>
        </div>
        <div
          className={cn(
            "absolute inset-0",
            activeView === "preview" ? "visible" : "invisible",
          )}
        >
          <PreviewView projectId={projectId} isActive={activeView === "preview"} />
        </div>
      </div>
    </div>
  );
};
