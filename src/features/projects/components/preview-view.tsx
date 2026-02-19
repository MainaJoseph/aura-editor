"use client";

import { useState, useEffect, useCallback } from "react";
import { Allotment } from "allotment";
import {
  Loader2Icon,
  TerminalSquareIcon,
  AlertTriangleIcon,
  RefreshCwIcon,
  FolderSyncIcon,
} from "lucide-react";
import { VscTerminal } from "react-icons/vsc";

import { useWebContainer } from "@/features/preview/hooks/use-webcontainer";
import { useTerminal } from "@/features/preview/hooks/use-terminal";
import { useConsole } from "@/features/preview/hooks/use-console";
import { PreviewSettingsPopover } from "@/features/preview/components/preview-settings-popover";
import { PreviewTerminal } from "@/features/preview/components/preview-terminal";
import { PreviewConsole } from "@/features/preview/components/preview-console";
import { TerminalTabs } from "@/features/preview/components/terminal-tabs";
import { PanelTabs } from "@/features/preview/components/panel-tabs";
import { MAX_TERMINALS } from "@/features/preview/store/use-terminal-store";

import { Button } from "@/components/ui/button";

import { useProject } from "../hooks/use-projects";

import { Id } from "../../../../convex/_generated/dataModel";

export const PreviewView = ({
  projectId,
  isActive,
}: {
  projectId: Id<"projects">;
  isActive: boolean;
}) => {
  const project = useProject(projectId);
  const [showTerminal, setShowTerminal] = useState(true);
  const [activePanel, setActivePanel] = useState<"terminal" | "console">(
    "terminal",
  );

  const {
    status,
    previewUrl,
    error,
    restart,
    getContainer,
    syncFilesToConvex,
    isSyncing,
  } = useWebContainer({
    projectId,
    enabled: true,
    settings: project?.settings,
  });

  const {
    terminals,
    activeTerminalId,
    createNewTerminal,
    closeTerminal,
    setActiveTerminal,
    renameTerminal,
    writeToTerminal,
    resizeTerminal,
  } = useTerminal({ projectId, getContainer });

  const { entries: consoleEntries, clearEntries: clearConsoleEntries } =
    useConsole({ projectId });

  const isBooting = status === "booting";

  const togglePanel = useCallback(() => {
    setShowTerminal((value) => !value);
  }, []);

  // Ctrl+` (Windows/Linux) or Cmd+` (Mac) to toggle bottom panel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        isActive &&
        e.key === "`" &&
        (e.ctrlKey || e.metaKey) &&
        !e.shiftKey &&
        !e.altKey
      ) {
        e.preventDefault();
        togglePanel();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isActive, togglePanel]);

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="h-8.75 flex items-center border-b bg-sidebar shrink-0">
        <Button
          size="sm"
          variant="ghost"
          className="h-full rounded-none"
          disabled={isBooting}
          onClick={restart}
          title="Restart container"
        >
          <RefreshCwIcon className="size-3" />
        </Button>

        <div className="flex-1 h-full flex items-center px-3 bg-background border-x text-xs text-muted-foreground truncate font-mono">
          {isBooting && (
            <div className="flex items-center gap-1.5">
              <Loader2Icon className="size-3 animate-spin" />
              Starting...
            </div>
          )}
          {isSyncing && !isBooting && (
            <div className="flex items-center gap-1.5">
              <Loader2Icon className="size-3 animate-spin" />
              Syncing files...
            </div>
          )}
          {previewUrl && !isSyncing && (
            <span className="truncate">{previewUrl}</span>
          )}
          {!isBooting && !isSyncing && !previewUrl && !error && (
            <span>Terminal ready</span>
          )}
        </div>

        <Button
          size="sm"
          variant="ghost"
          className="h-full rounded-none"
          title="Sync files to editor"
          disabled={isBooting || isSyncing}
          onClick={syncFilesToConvex}
        >
          {isSyncing ? (
            <Loader2Icon className="size-3 animate-spin" />
          ) : (
            <FolderSyncIcon className="size-3" />
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-full rounded-none"
          title="Toggle panel (⌘+`)"
          onClick={togglePanel}
        >
          <VscTerminal className="size-3" />
        </Button>
        <PreviewSettingsPopover
          projectId={projectId}
          initialValues={project?.settings}
          onSave={restart}
        />
      </div>

      <div className="flex-1 min-h-0">
        <Allotment vertical>
          <Allotment.Pane>
            {error && (
              <div className="size-full flex items-center justify-center text-muted-foreground">
                <div className="flex flex-col items-center gap-2 max-w-md mx-auto text-center">
                  <AlertTriangleIcon className="size-6" />
                  <p className="text-sm font-medium">{error}</p>
                  <Button size="sm" variant="outline" onClick={restart}>
                    <RefreshCwIcon className="size-4" />
                    Restart
                  </Button>
                </div>
              </div>
            )}

            {isBooting && !error && (
              <div className="size-full flex items-center justify-center text-muted-foreground">
                <div className="flex flex-col items-center gap-2 max-w-md mx-auto text-center">
                  <Loader2Icon className="size-6 animate-spin" />
                  <p className="text-sm font-medium">Starting container...</p>
                </div>
              </div>
            )}

            {status === "ready" && !previewUrl && !error && (
              <div className="size-full flex items-center justify-center text-muted-foreground">
                <div className="flex flex-col items-center gap-2 max-w-md mx-auto text-center">
                  <TerminalSquareIcon className="size-6" />
                  <p className="text-sm font-medium">
                    Run a dev server to see preview
                  </p>
                  <p className="text-xs">
                    Use the terminal below to run commands
                  </p>
                </div>
              </div>
            )}

            {previewUrl && (
              <iframe
                src={previewUrl}
                className="size-full border-0"
                title="Preview"
              />
            )}
          </Allotment.Pane>

          <Allotment.Pane
            visible={showTerminal}
            minSize={100}
            maxSize={500}
            preferredSize={200}
          >
            <div className="h-full flex flex-col bg-background border-t">
              <PanelTabs
                activePanel={activePanel}
                onPanelChange={setActivePanel}
                onCreateTerminal={createNewTerminal}
                canCreateTerminal={terminals.length < MAX_TERMINALS}
                consoleEntryCount={consoleEntries.length}
              />
              {activePanel === "terminal" && (
                <div className="flex-1 min-h-0 flex flex-row">
                  <div className="flex-1 min-w-0 flex flex-col">
                    {terminals.map((terminal) => (
                      <PreviewTerminal
                        key={terminal.id}
                        output={terminal.output}
                        isVisible={terminal.id === activeTerminalId}
                        onInput={(data) => writeToTerminal(terminal.id, data)}
                        onResize={(cols, rows) =>
                          resizeTerminal(terminal.id, cols, rows)
                        }
                      />
                    ))}
                  </div>
                  {terminals.length > 1 && (
                    <TerminalTabs
                      terminals={terminals}
                      activeTerminalId={activeTerminalId}
                      onSelect={setActiveTerminal}
                      onClose={closeTerminal}
                      onRename={renameTerminal}
                      onCreateTerminal={createNewTerminal}
                      canCreate={terminals.length < MAX_TERMINALS}
                    />
                  )}
                </div>
              )}
              {activePanel === "console" && (
                <PreviewConsole
                  entries={consoleEntries}
                  onClear={clearConsoleEntries}
                />
              )}
            </div>
          </Allotment.Pane>
        </Allotment>
      </div>
    </div>
  );
};
