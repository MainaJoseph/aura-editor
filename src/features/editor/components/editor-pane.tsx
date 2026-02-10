import Image from "next/image";
import { useEffect, useRef } from "react";

import { useFile, useUpdateFile } from "@/features/projects/hooks/use-files";

import { CodeEditor } from "./code-editor";
import { useEditorPane } from "../hooks/use-editor-pane";
import { useEditorStore } from "../store/use-editor-store";
import { TopNavigation } from "./top-navigation";
import { FileBreadcrumbs } from "./file-breadcrumbs";
import { Id } from "../../../../convex/_generated/dataModel";
import { AlertTriangleIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 1500;

export const EditorPane = ({
  projectId,
  paneIndex,
}: {
  projectId: Id<"projects">;
  paneIndex: number;
}) => {
  const { activeTabId, isActivePane, setActivePane } = useEditorPane(
    projectId,
    paneIndex
  );
  const activeFile = useFile(activeTabId);
  const updateFile = useUpdateFile();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingContentRef = useRef<{ fileId: Id<"files">; content: string } | null>(null);
  const saveAllSignal = useEditorStore((s) => s.saveAllSignal);

  const isActiveFileBinary = activeFile && activeFile.storageId;
  const isActiveFileText = activeFile && !activeFile.storageId;

  // Cleanup pending debounced updates on unmount or file change
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [activeTabId]);

  // Flush pending save when saveAllSignal fires
  useEffect(() => {
    if (saveAllSignal > 0 && timeoutRef.current && pendingContentRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      const { fileId, content } = pendingContentRef.current;
      pendingContentRef.current = null;
      updateFile({ id: fileId, content });
    }
  }, [saveAllSignal, updateFile]);

  return (
    <div
      className={cn(
        "h-full flex flex-col",
        isActivePane && "ring-1 ring-ring/50 ring-inset"
      )}
      onClick={setActivePane}
    >
      <div className="flex items-center">
        <TopNavigation projectId={projectId} paneIndex={paneIndex} />
      </div>
      {activeTabId && (
        <FileBreadcrumbs projectId={projectId} paneIndex={paneIndex} />
      )}
      <div className="flex-1 min-h-0 bg-background">
        {!activeFile && (
          <div className="size-full flex items-center justify-center">
            <Image
              src="/logo.svg"
              alt="Aura"
              width={50}
              height={50}
              className="opacity-25"
            />
          </div>
        )}
        {isActiveFileText && (
          <CodeEditor
            key={activeFile._id}
            fileName={activeFile.name}
            initialValue={activeFile.content}
            onChange={(content: string) => {
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
              }

              pendingContentRef.current = { fileId: activeFile._id, content };
              timeoutRef.current = setTimeout(() => {
                pendingContentRef.current = null;
                updateFile({ id: activeFile._id, content });
              }, DEBOUNCE_MS);
            }}
          />
        )}
        {isActiveFileBinary && (
          <div className="size-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-2.5 max-w-md text-center">
              <AlertTriangleIcon className="size-10 text-yellow-500" />
              <p className="text-sm">
                The file is not displayed in the text editor because it is
                either binary or uses an unsupported text encoding.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
