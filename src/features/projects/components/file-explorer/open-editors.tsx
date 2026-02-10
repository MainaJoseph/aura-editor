import { useState } from "react";
import { ChevronRightIcon, SaveIcon, XIcon } from "lucide-react";
import { FileIcon } from "@react-symbols/icons/utils";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { useEditor } from "@/features/editor/hooks/use-editor";
import { useFile } from "../../hooks/use-files";
import { Id } from "../../../../../convex/_generated/dataModel";

const OpenEditorItem = ({
  fileId,
  projectId,
}: {
  fileId: Id<"files">;
  projectId: Id<"projects">;
}) => {
  const file = useFile(fileId);
  const { activeTabId, previewTabId, setActiveTab, closeTab } =
    useEditor(projectId);
  const isActive = activeTabId === fileId;
  const isPreview = previewTabId === fileId;
  const fileName = file?.name ?? "Loading...";

  return (
    <div
      role="button"
      onClick={() => setActiveTab(fileId)}
      className={cn(
        "group/item flex items-center gap-1 h-5.5 pl-5.5 pr-1 cursor-pointer hover:bg-accent/30",
        isActive && "bg-accent/30"
      )}
    >
      <FileIcon fileName={fileName} autoAssign className="size-4 shrink-0" />
      <span
        className={cn("truncate text-sm flex-1", isPreview && "italic")}
      >
        {fileName}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          closeTab(fileId);
        }}
        className={cn(
          "p-0.5 rounded-sm hover:bg-white/10 opacity-0 group-hover/item:opacity-100 shrink-0",
          isActive && "opacity-100"
        )}
      >
        <XIcon className="size-3.5" />
      </button>
    </div>
  );
};

export const OpenEditors = ({
  projectId,
}: {
  projectId: Id<"projects">;
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const { allOpenTabs, closeAllTabsAllPanes, triggerSaveAll } =
    useEditor(projectId);

  return (
    <div>
      <div
        role="button"
        onClick={() => setIsOpen((v) => !v)}
        className="group/editors cursor-pointer w-full text-left flex items-center gap-0.5 h-5.5 bg-accent font-bold"
      >
        <ChevronRightIcon
          className={cn(
            "size-4 shrink-0 text-muted-foreground",
            isOpen && "rotate-90"
          )}
        />
        <p className="text-xs uppercase line-clamp-1">Open Editors</p>
        <div className="opacity-0 group-hover/editors:opacity-100 transition-none duration-0 flex items-center gap-0.5 ml-auto">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              triggerSaveAll();
            }}
            variant="highlight"
            size="icon-xs"
            title="Save All"
          >
            <SaveIcon className="size-3.5" />
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              triggerSaveAll();
              closeAllTabsAllPanes();
            }}
            variant="highlight"
            size="icon-xs"
            title="Close All"
          >
            <XIcon className="size-3.5" />
          </Button>
        </div>
      </div>
      {isOpen &&
        allOpenTabs.map((fileId) => (
          <OpenEditorItem
            key={fileId}
            fileId={fileId}
            projectId={projectId}
          />
        ))}
    </div>
  );
};
