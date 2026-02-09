import { useState } from "react";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

import { useFile } from "@/features/projects/hooks/use-files";

import { useEditor } from "../hooks/use-editor";
import { Id } from "../../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { FileIcon } from "@react-symbols/icons/utils";
import { XIcon } from "lucide-react";

const Tab = ({
  fileId,
  isFirst,
  projectId,
  index,
  onReorder,
}: {
  fileId: Id<"files">;
  isFirst: boolean;
  projectId: Id<"projects">;
  index: number;
  onReorder: (fromIndex: number, toIndex: number) => void;
}) => {
  const file = useFile(fileId);
  const { activeTabId, previewTabId, setActiveTab, openFile, closeTab } =
    useEditor(projectId);

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
        <FileIcon fileName={fileName} autoAssign className="size-4" />
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

export const TopNavigation = ({ projectId }: { projectId: Id<"projects"> }) => {
  const { openTabs, openFile, reorderTab } = useEditor(projectId);
  const [isDragOver, setIsDragOver] = useState(false);

  return (
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
            index={index}
            onReorder={reorderTab}
          />
        ))}
      </nav>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};
