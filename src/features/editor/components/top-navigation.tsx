import { useState } from "react";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

import { useFile } from "@/features/projects/hooks/use-files";

import { useEditorPane } from "../hooks/use-editor-pane";
import { useEditor } from "../hooks/use-editor";
import { Id } from "../../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { AppFileIcon } from "@/features/projects/components/file-explorer/app-file-icon";
import { IconStyleProvider } from "@/features/projects/components/file-explorer/icon-context";
import { useMaterialIcons } from "@/features/projects/hooks/use-material-icons";
import { useEditorStore, ExtensionTabData } from "../store/use-editor-store";
import { BlocksIcon, Columns2Icon, XIcon } from "lucide-react";
import { VscTerminal } from "react-icons/vsc";

const Tab = ({
  fileId,
  isFirst,
  projectId,
  paneIndex,
  index,
  onReorder,
}: {
  fileId: Id<"files">;
  isFirst: boolean;
  projectId: Id<"projects">;
  paneIndex: number;
  index: number;
  onReorder: (fromIndex: number, toIndex: number) => void;
}) => {
  const file = useFile(fileId);
  const { activeTabId, previewTabId, setActiveTab, openFile, closeTab } =
    useEditorPane(projectId, paneIndex);

  const [isDragging, setIsDragging] = useState(false);
  const [dropSide, setDropSide] = useState<"left" | "right" | null>(null);

  const isActive = activeTabId === fileId;
  const isPreview = previewTabId === fileId;
  const fileName = file?.name ?? "Loading...";

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/aura-tab-index", String(index));
        e.dataTransfer.setData("application/aura-file-id", fileId);
        e.dataTransfer.effectAllowed = "move";
        setIsDragging(true);
      }}
      onDragEnd={() => setIsDragging(false)}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("application/aura-tab-index")) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const rect = e.currentTarget.getBoundingClientRect();
        const midpoint = rect.left + rect.width / 2;
        setDropSide(e.clientX < midpoint ? "left" : "right");
      }}
      onDragLeave={() => setDropSide(null)}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDropSide(null);
        const fromIndex = Number(
          e.dataTransfer.getData("application/aura-tab-index")
        );
        if (isNaN(fromIndex)) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const midpoint = rect.left + rect.width / 2;
        const dropIndex =
          e.clientX < midpoint
            ? fromIndex < index
              ? index - 1
              : index
            : fromIndex > index
              ? index + 1
              : index;
        onReorder(fromIndex, dropIndex);
      }}
      onClick={() => setActiveTab(fileId)}
      onDoubleClick={() => openFile(fileId, { pinned: true })}
      className={cn(
        "flex items-center gap-2 h-8.75 pl-2 pr-1.5 cursor-pointer text-muted-foreground group border-y border-x border-transparent hover:bg-accent/30",
        isActive &&
          "bg-background text-foreground border-x-border border-b-background -mb-px drop-shadow",
        isFirst && "border-l-transparent!",
        isDragging && "opacity-50",
        dropSide === "left" && "border-l-ring!",
        dropSide === "right" && "border-r-ring!"
      )}
    >
      {file === undefined ? (
        <Spinner className="text-ring" />
      ) : (
        <AppFileIcon fileName={fileName} className="size-4" />
      )}
      <span className={cn("text-sm whitespace-nowrap", isPreview && "italic")}>
        {fileName}
      </span>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          closeTab(fileId);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            closeTab(fileId);
          }
        }}
        className={cn(
          "p-0.5 rounded-sm hover:bg-white/10 opacity-0 group-hover:opacity-100",
          isActive && "opacity-100"
        )}
      >
        <XIcon className="size-3.5" />
      </button>
    </div>
  );
};

const ExtensionTab = ({
  ext,
  projectId,
  isFirst,
  index,
  onReorder,
}: {
  ext: ExtensionTabData;
  projectId: Id<"projects">;
  isFirst: boolean;
  index: number;
  onReorder: (fromIndex: number, toIndex: number) => void;
}) => {
  const store = useEditorStore();
  const projectState = useEditorStore((s) => s.getProjectState(projectId));
  const isActive = projectState.activeExtensionId === ext._id;

  const [isDragging, setIsDragging] = useState(false);
  const [dropSide, setDropSide] = useState<"left" | "right" | null>(null);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/aura-ext-tab-index", String(index));
        e.dataTransfer.effectAllowed = "move";
        setIsDragging(true);
      }}
      onDragEnd={() => setIsDragging(false)}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("application/aura-ext-tab-index")) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const rect = e.currentTarget.getBoundingClientRect();
        const midpoint = rect.left + rect.width / 2;
        setDropSide(e.clientX < midpoint ? "left" : "right");
      }}
      onDragLeave={() => setDropSide(null)}
      onDrop={(e) => {
        e.preventDefault();
        setDropSide(null);
        const fromIndex = Number(
          e.dataTransfer.getData("application/aura-ext-tab-index")
        );
        if (isNaN(fromIndex)) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const midpoint = rect.left + rect.width / 2;
        const dropIndex =
          e.clientX < midpoint
            ? fromIndex < index
              ? index - 1
              : index
            : fromIndex > index
              ? index + 1
              : index;
        onReorder(fromIndex, dropIndex);
      }}
      onClick={() => store.setActiveExtensionTab(projectId, ext._id)}
      className={cn(
        "flex items-center gap-2 h-8.75 pl-2 pr-1.5 cursor-pointer text-muted-foreground group border-y border-x border-transparent hover:bg-accent/30",
        isActive &&
          "bg-background text-foreground border-x-border border-b-background -mb-px drop-shadow",
        isFirst && "border-l-transparent!",
        isDragging && "opacity-50",
        dropSide === "left" && "border-l-ring!",
        dropSide === "right" && "border-r-ring!"
      )}
    >
      <BlocksIcon className="size-3.5 text-muted-foreground shrink-0" />
      <span className="text-sm whitespace-nowrap">{ext.name}</span>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          store.closeExtensionTab(projectId, ext._id);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            store.closeExtensionTab(projectId, ext._id);
          }
        }}
        className={cn(
          "p-0.5 rounded-sm hover:bg-white/10 opacity-0 group-hover:opacity-100",
          isActive && "opacity-100"
        )}
      >
        <XIcon className="size-3.5" />
      </button>
    </div>
  );
};

export const TopNavigation = ({
  projectId,
  paneIndex,
}: {
  projectId: Id<"projects">;
  paneIndex: number;
}) => {
  const { openTabs, openFile, reorderTab } = useEditorPane(
    projectId,
    paneIndex
  );
  const { isSplit, splitEditor, closeSplit, reorderExtensionTab } = useEditor(projectId);
  const materialIcons = useMaterialIcons(projectId);
  const projectState = useEditorStore((s) => s.getProjectState(projectId));
  const openExtensions = paneIndex === 0 ? projectState.openExtensions : [];
  const showTerminalPanel = projectState.showTerminalPanel;
  const toggleTerminalPanel = useEditorStore((s) => s.toggleTerminalPanel);
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <IconStyleProvider value={materialIcons}>
    <div className="flex items-center w-full">
      <ScrollArea className="flex-1">
        <nav
          className={cn(
            "bg-sidebar flex items-center h-8.75 border-b",
            isDragOver && "ring-1 ring-inset ring-ring"
          )}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("application/aura-file-id")) {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
              setIsDragOver(true);
            }
          }}
          onDragEnter={(e) => {
            if (e.dataTransfer.types.includes("application/aura-file-id")) {
              setIsDragOver(true);
            }
          }}
          onDragLeave={(e) => {
            if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) {
              setIsDragOver(false);
            }
          }}
          onDrop={(e) => {
            setIsDragOver(false);
            const fileId = e.dataTransfer.getData("application/aura-file-id");
            if (!fileId) return;
            e.preventDefault();
            openFile(fileId as Id<"files">, { pinned: true });
          }}
        >
          {openTabs.map((fileId, index) => (
            <Tab
              key={fileId}
              fileId={fileId}
              isFirst={index === 0}
              projectId={projectId}
              paneIndex={paneIndex}
              index={index}
              onReorder={reorderTab}
            />
          ))}
          {openExtensions.map((ext, index) => (
            <ExtensionTab
              key={ext._id}
              ext={ext}
              projectId={projectId}
              isFirst={openTabs.length === 0 && index === 0}
              index={index}
              onReorder={reorderExtensionTab}
            />
          ))}
        </nav>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      <div className="flex items-center h-8.75 border-b bg-sidebar">
        {paneIndex === 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleTerminalPanel(projectId);
            }}
            className={cn(
              "flex items-center justify-center size-8.75 text-muted-foreground hover:text-foreground hover:bg-accent/30",
              showTerminalPanel && "text-foreground bg-accent/30"
            )}
            title="Toggle terminal panel (⌘+`)"
          >
            <VscTerminal className="size-3.5" />
          </button>
        )}
        {isSplit ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeSplit(paneIndex);
            }}
            className="flex items-center justify-center size-8.75 text-muted-foreground hover:text-foreground hover:bg-accent/30"
            title="Close split"
          >
            <XIcon className="size-3.5" />
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              splitEditor();
            }}
            className="flex items-center justify-center size-8.75 text-muted-foreground hover:text-foreground hover:bg-accent/30"
            title="Split editor (Ctrl+\)"
          >
            <Columns2Icon className="size-3.5" />
          </button>
        )}
      </div>
    </div>
    </IconStyleProvider>
  );
};
