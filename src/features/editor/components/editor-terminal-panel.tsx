"use client";

import { useState } from "react";

import { useTerminal } from "@/features/preview/hooks/use-terminal";
import { useConsole } from "@/features/preview/hooks/use-console";
import { PreviewTerminal } from "@/features/preview/components/preview-terminal";
import { PreviewConsole } from "@/features/preview/components/preview-console";
import { TerminalTabs } from "@/features/preview/components/terminal-tabs";
import { PanelTabs } from "@/features/preview/components/panel-tabs";
import { MAX_TERMINALS } from "@/features/preview/store/use-terminal-store";
import { getContainerInstance } from "@/features/preview/hooks/use-webcontainer";

import { Id } from "../../../../convex/_generated/dataModel";

interface EditorTerminalPanelProps {
  projectId: Id<"projects">;
}

export const EditorTerminalPanel = ({ projectId }: EditorTerminalPanelProps) => {
  const [activePanel, setActivePanel] = useState<"terminal" | "console">("terminal");

  const {
    terminals,
    activeTerminalId,
    createNewTerminal,
    closeTerminal,
    setActiveTerminal,
    renameTerminal,
    writeToTerminal,
    resizeTerminal,
  } = useTerminal({ projectId, getContainer: getContainerInstance });

  const { entries: consoleEntries, clearEntries: clearConsoleEntries } =
    useConsole({ projectId });

  return (
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
                onResize={(cols, rows) => resizeTerminal(terminal.id, cols, rows)}
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
  );
};
