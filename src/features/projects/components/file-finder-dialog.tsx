import { useEffect, useRef, useMemo } from "react";
import { FileIcon } from "@react-symbols/icons/utils";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useFiles } from "../hooks/use-files";
import { useEditor } from "@/features/editor/hooks/use-editor";
import { getFilePath } from "@/features/preview/utils/file-tree";
import { Doc, Id } from "../../../../convex/_generated/dataModel";

interface FileFinderDialogProps {
  projectId: Id<"projects">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FileDoc = Doc<"files">;

export const FileFinderDialog = ({
  projectId,
  open,
  onOpenChange,
}: FileFinderDialogProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const files = useFiles(projectId);
  const { openFile, allOpenTabs } = useEditor(projectId);

  const filesMap = useMemo(() => {
    if (!files) return new Map<Id<"files">, FileDoc>();
    return new Map(files.map((f) => [f._id, f]));
  }, [files]);

  const fileEntries = useMemo(() => {
    if (!files) return [];
    return files
      .filter((f) => f.type === "file" && !f.storageId)
      .map((f) => {
        const fullPath = getFilePath(f, filesMap);
        const lastSlash = fullPath.lastIndexOf("/");
        const dirPath = lastSlash > 0 ? fullPath.substring(0, lastSlash) : "";
        return { id: f._id, name: f.name, path: fullPath, dirPath };
      });
  }, [files, filesMap]);

  const openTabSet = useMemo(() => new Set(allOpenTabs), [allOpenTabs]);

  const recentFiles = useMemo(
    () => fileEntries.filter((f) => openTabSet.has(f.id)),
    [fileEntries, openTabSet],
  );

  const otherFiles = useMemo(
    () => fileEntries.filter((f) => !openTabSet.has(f.id)),
    [fileEntries, openTabSet],
  );

  // Close on Escape
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onOpenChange(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onOpenChange]);

  const handleSelect = (fileId: Id<"files">) => {
    openFile(fileId, { pinned: true });
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div
      ref={containerRef}
      className="absolute top-full left-1/2 -translate-x-1/2 z-50 w-full max-w-md mt-1 rounded-md border bg-popover shadow-lg animate-in fade-in-0 slide-in-from-top-1 duration-100"
    >
      <Command className="rounded-md">
        <CommandInput placeholder="Search files by name..." autoFocus />
        <CommandList>
          <CommandEmpty>No files found.</CommandEmpty>
          {recentFiles.length > 0 && (
            <CommandGroup heading="Recently opened">
              {recentFiles.map((file) => (
                <CommandItem
                  key={file.id}
                  value={file.path}
                  onSelect={() => handleSelect(file.id)}
                >
                  <FileIcon
                    fileName={file.name}
                    autoAssign
                    className="size-4"
                  />
                  <span>{file.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground truncate">
                    {file.dirPath}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          <CommandGroup heading="Files">
            {otherFiles.map((file) => (
              <CommandItem
                key={file.id}
                value={file.path}
                onSelect={() => handleSelect(file.id)}
              >
                <FileIcon
                  fileName={file.name}
                  autoAssign
                  className="size-4"
                />
                <span>{file.name}</span>
                <span className="ml-auto text-xs text-muted-foreground truncate">
                  {file.dirPath}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
};
