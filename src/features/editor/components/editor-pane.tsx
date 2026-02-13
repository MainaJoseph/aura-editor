import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { useFile, useUpdateFile } from "@/features/projects/hooks/use-files";

import { CodeEditor } from "./code-editor";
import { useEditorPane } from "../hooks/use-editor-pane";
import { useActiveTheme } from "../hooks/use-active-theme";
import { useActiveEditorFeatures } from "../hooks/use-active-editor-features";
import { useEditorStore } from "../store/use-editor-store";
import { useCollaborativeEditor } from "../hooks/use-collaborative-editor";
import { TopNavigation } from "./top-navigation";
import { FileBreadcrumbs } from "./file-breadcrumbs";
import { ExtensionDetailPage } from "@/features/extensions/components/extension-detail-page";
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
  const { activeTabId, isActivePane, setActivePane, openFile } = useEditorPane(
    projectId,
    paneIndex
  );
  const [isDragOver, setIsDragOver] = useState(false);
  const themeConfigKey = useActiveTheme(projectId);
  const activeEditorFeatures = useActiveEditorFeatures(projectId);
  const activeFile = useFile(activeTabId);
  const updateFile = useUpdateFile();

  const projectState = useEditorStore((s) => s.getProjectState(projectId));
  const activeExtension =
    paneIndex === 0
      ? projectState.openExtensions.find(
          (e) => e._id === projectState.activeExtensionId
        ) ?? null
      : null;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingContentRef = useRef<{ fileId: Id<"files">; content: string } | null>(null);
  const saveAllSignal = useEditorStore((s) => s.saveAllSignal);

  const isActiveFileBinary = activeFile && activeFile.storageId;
  const isActiveFileText = activeFile && !activeFile.storageId;

  // Collaborative editing
  const { yjsProvider, isCollabReady } = useCollaborativeEditor(
    isActiveFileText ? activeFile._id : null,
    activeFile?.content ?? undefined,
    projectId,
  );

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

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (e.dataTransfer.types.includes("application/aura-file-id")) {
        e.preventDefault();
        setIsDragOver(true);
      }
    },
    []
  );

  const handleDragEnter = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (e.dataTransfer.types.includes("application/aura-file-id")) {
        setIsDragOver(true);
      }
    },
    []
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (
        !e.currentTarget.contains(e.relatedTarget as Node)
      ) {
        setIsDragOver(false);
      }
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const fileId = e.dataTransfer.getData("application/aura-file-id");
      if (fileId) {
        openFile(fileId as Id<"files">, { pinned: true });
      }
    },
    [openFile]
  );

  return (
    <div
      className={cn(
        "h-full flex flex-col",
        isActivePane && "ring-1 ring-ring/50 ring-inset",
        isDragOver && "ring-2 ring-ring/50 ring-inset"
      )}
      onClick={setActivePane}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center">
        <TopNavigation projectId={projectId} paneIndex={paneIndex} />
      </div>
      {activeExtension ? (
        <div className="flex-1 min-h-0 bg-background">
          <ExtensionDetailPage
            extension={activeExtension}
            projectId={projectId}
          />
        </div>
      ) : (
        <>
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
            {isActiveFileText && yjsProvider && isCollabReady && (
              <CodeEditor
                key={`${activeFile._id}-collab`}
                fileName={activeFile.name}
                themeConfigKey={themeConfigKey}
                activeEditorFeatures={activeEditorFeatures}
                yjsProvider={yjsProvider}
              />
            )}
            {isActiveFileText && !yjsProvider && (
              <CodeEditor
                key={activeFile._id}
                fileName={activeFile.name}
                initialValue={activeFile.content}
                themeConfigKey={themeConfigKey}
                activeEditorFeatures={activeEditorFeatures}
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
        </>
      )}
    </div>
  );
};
