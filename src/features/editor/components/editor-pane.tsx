import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";

import { useFile, useUpdateFile } from "@/features/projects/hooks/use-files";
import { useProjectRole } from "@/features/projects/hooks/use-members";

import { CodeEditor } from "./code-editor";
import { useEditorPane } from "../hooks/use-editor-pane";
import { useActiveTheme } from "../hooks/use-active-theme";
import { useActiveEditorFeatures } from "../hooks/use-active-editor-features";
import { useEditorStore } from "../store/use-editor-store";

import { TopNavigation } from "./top-navigation";
import { FileBreadcrumbs } from "./file-breadcrumbs";
import { ExtensionDetailPage } from "@/features/extensions/components/extension-detail-page";
import { Id } from "../../../../convex/_generated/dataModel";
import { api } from "../../../../convex/_generated/api";
import { AlertTriangleIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RemoteCursor } from "../extensions/remote-cursors";

const DEBOUNCE_MS = 1500;
const PRESENCE_INTERVAL_MS = 10_000;
const CURSOR_BROADCAST_DEBOUNCE_MS = 500;

const CURSOR_COLORS = [
  "#e06c75",
  "#e5c07b",
  "#98c379",
  "#56b6c2",
  "#61afef",
  "#c678dd",
  "#d19a66",
  "#be5046",
];

function hashToColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

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
  const role = useProjectRole(projectId);
  const { user } = useUser();

  // Treat undefined (loading) as read-only to prevent viewers from briefly editing
  const isReadOnly = role === undefined || role === "viewer";

  const projectState = useEditorStore((s) => s.getProjectState(projectId));
  const activeExtension =
    paneIndex === 0
      ? projectState.openExtensions.find(
          (e) => e._id === projectState.activeExtensionId
        ) ?? null
      : null;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingContentRef = useRef<{ fileId: Id<"files">; content: string } | null>(null);
  const [hasPendingEdits, setHasPendingEdits] = useState(false);
  const saveAllSignal = useEditorStore((s) => s.saveAllSignal);

  const isActiveFileBinary = activeFile && activeFile.storageId;
  const isActiveFileText = activeFile && !activeFile.storageId;

  // --- Presence ---
  const updatePresence = useMutation(api.presence.updatePresence);
  const removePresence = useMutation(api.presence.removePresence);
  const cursorOffsetRef = useRef<number | undefined>(undefined);

  const userColor = useMemo(() => {
    return hashToColor(user?.id ?? "anonymous");
  }, [user?.id]);

  const cursorBroadcastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendPresenceNow = useCallback(() => {
    updatePresence({
      projectId,
      fileId: activeTabId ?? undefined,
      userColor,
      cursorOffset: cursorOffsetRef.current,
    });
  }, [updatePresence, projectId, activeTabId, userColor]);

  // Presence heartbeat (liveness)
  useEffect(() => {
    // Send immediately on mount / file change
    sendPresenceNow();

    const interval = setInterval(sendPresenceNow, PRESENCE_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      if (cursorBroadcastTimerRef.current) {
        clearTimeout(cursorBroadcastTimerRef.current);
      }
      removePresence({ projectId });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, activeTabId, userColor]);

  // Broadcast cursor position immediately (debounced 500ms) on move
  const handleCursorChange = useCallback((offset: number) => {
    cursorOffsetRef.current = offset;
    if (cursorBroadcastTimerRef.current) {
      clearTimeout(cursorBroadcastTimerRef.current);
    }
    cursorBroadcastTimerRef.current = setTimeout(() => {
      sendPresenceNow();
    }, CURSOR_BROADCAST_DEBOUNCE_MS);
  }, [sendPresenceNow]);

  // --- Remote cursors ---
  const presenceData = useQuery(api.presence.getProjectPresence, { projectId });

  const remoteCursorData: RemoteCursor[] = useMemo(() => {
    if (!presenceData || !activeTabId) return [];
    return presenceData
      .filter(
        (entry) =>
          entry.fileId === activeTabId && entry.cursorOffset != null
      )
      .map((entry) => ({
        offset: entry.cursorOffset!,
        userName: entry.userName,
        userColor: entry.userColor,
      }));
  }, [presenceData, activeTabId]);

  // Cleanup pending debounced updates on unmount or file change
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setHasPendingEdits(false);
    };
  }, [activeTabId]);

  // Flush pending save when saveAllSignal fires
  useEffect(() => {
    if (saveAllSignal > 0 && timeoutRef.current && pendingContentRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      const { fileId, content } = pendingContentRef.current;
      pendingContentRef.current = null;
      setHasPendingEdits(false);
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
            {isActiveFileText ? (
              <CodeEditor
                key={activeFile._id}
                fileName={activeFile.name}
                initialValue={activeFile.content}
                themeConfigKey={themeConfigKey}
                activeEditorFeatures={activeEditorFeatures}
                readOnly={isReadOnly}
                externalContent={activeFile.content}
                hasPendingEdits={hasPendingEdits}
                remoteCursorData={remoteCursorData}
                onChange={
                  isReadOnly
                    ? undefined
                    : (content: string) => {
                        if (timeoutRef.current) {
                          clearTimeout(timeoutRef.current);
                        }

                        setHasPendingEdits(true);
                        pendingContentRef.current = { fileId: activeFile._id, content };
                        timeoutRef.current = setTimeout(() => {
                          pendingContentRef.current = null;
                          setHasPendingEdits(false);
                          updateFile({ id: activeFile._id, content });
                        }, DEBOUNCE_MS);
                      }
                }
                onCursorChange={handleCursorChange}
              />
            ) : null}
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
