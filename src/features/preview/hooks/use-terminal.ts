import { useCallback } from "react";
import { WebContainer } from "@webcontainer/api";

import {
  useTerminalStore,
  TerminalInstance,
} from "@/features/preview/store/use-terminal-store";
import {
  writeToProcess,
  resizeProcess,
} from "@/features/preview/store/terminal-process-refs";
import { spawnShellProcess } from "@/features/preview/utils/spawn-shell-process";

import { Id } from "../../../../convex/_generated/dataModel";

interface UseTerminalProps {
  projectId: Id<"projects">;
  getContainer: () => WebContainer | null;
}

interface UseTerminalReturn {
  terminals: TerminalInstance[];
  activeTerminalId: string | null;
  activeTerminal: TerminalInstance | null;
  createNewTerminal: () => void;
  closeTerminal: (terminalId: string) => void;
  setActiveTerminal: (terminalId: string) => void;
  renameTerminal: (terminalId: string, label: string) => void;
  writeToTerminal: (terminalId: string, data: string) => void;
  resizeTerminal: (terminalId: string, cols: number, rows: number) => void;
}

export const useTerminal = ({
  projectId,
  getContainer,
}: UseTerminalProps): UseTerminalReturn => {
  const projectState = useTerminalStore((s) => s.getProjectState(projectId));
  const { terminals, activeTerminalId } = projectState;

  const activeTerminal =
    terminals.find((t) => t.id === activeTerminalId) ?? null;

  const createNewTerminal = useCallback(() => {
    const container = getContainer();
    if (!container) return;

    const terminalId = useTerminalStore.getState().createTerminal(projectId);
    if (!terminalId) return;

    spawnShellProcess(container, terminalId, projectId);
  }, [projectId, getContainer]);

  const closeTerminal = useCallback(
    (terminalId: string) => {
      useTerminalStore.getState().closeTerminal(projectId, terminalId);
    },
    [projectId],
  );

  const setActiveTerminal = useCallback(
    (terminalId: string) => {
      useTerminalStore.getState().setActiveTerminal(projectId, terminalId);
    },
    [projectId],
  );

  const renameTerminal = useCallback(
    (terminalId: string, label: string) => {
      useTerminalStore.getState().renameTerminal(projectId, terminalId, label);
    },
    [projectId],
  );

  const writeToTerminal = useCallback(
    (terminalId: string, data: string) => {
      writeToProcess(terminalId, data);
    },
    [],
  );

  const resizeTerminal = useCallback(
    (terminalId: string, cols: number, rows: number) => {
      resizeProcess(terminalId, cols, rows);
    },
    [],
  );

  return {
    terminals,
    activeTerminalId,
    activeTerminal,
    createNewTerminal,
    closeTerminal,
    setActiveTerminal,
    renameTerminal,
    writeToTerminal,
    resizeTerminal,
  };
};
