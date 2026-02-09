import { create } from "zustand";
import { nanoid } from "nanoid";

import { cleanupProcessRefs } from "./terminal-process-refs";

import { Id } from "../../../../convex/_generated/dataModel";

const MAX_TERMINALS = 5;

export interface TerminalInstance {
  id: string;
  label: string;
  output: string;
  status: "spawning" | "running" | "exited";
  isPrimary: boolean;
}

interface TerminalProjectState {
  terminals: TerminalInstance[];
  activeTerminalId: string | null;
}

const defaultProjectState: TerminalProjectState = {
  terminals: [],
  activeTerminalId: null,
};

interface TerminalStore {
  state: Map<Id<"projects">, TerminalProjectState>;
  getProjectState: (projectId: Id<"projects">) => TerminalProjectState;
  createTerminal: (
    projectId: Id<"projects">,
    options?: { label?: string; isPrimary?: boolean },
  ) => string | null;
  closeTerminal: (projectId: Id<"projects">, terminalId: string) => void;
  setActiveTerminal: (projectId: Id<"projects">, terminalId: string) => void;
  renameTerminal: (
    projectId: Id<"projects">,
    terminalId: string,
    label: string,
  ) => void;
  appendOutput: (
    projectId: Id<"projects">,
    terminalId: string,
    data: string,
  ) => void;
  setTerminalStatus: (
    projectId: Id<"projects">,
    terminalId: string,
    status: TerminalInstance["status"],
  ) => void;
  clearAllTerminals: (projectId: Id<"projects">) => void;
}

export const useTerminalStore = create<TerminalStore>()((set, get) => ({
  state: new Map(),

  getProjectState: (projectId) => {
    return get().state.get(projectId) ?? defaultProjectState;
  },

  createTerminal: (projectId, options) => {
    const state = new Map(get().state);
    const project = state.get(projectId) ?? { ...defaultProjectState };

    if (project.terminals.length >= MAX_TERMINALS) return null;

    const id = nanoid(8);

    // Find the lowest available number by checking existing labels
    let nextNum = 1;
    if (!options?.label) {
      const usedNumbers = new Set(
        project.terminals
          .map((t) => {
            const match = t.label.match(/^Terminal (\d+)$/);
            return match ? parseInt(match[1], 10) : null;
          })
          .filter((n): n is number => n !== null),
      );
      while (usedNumbers.has(nextNum)) nextNum++;
    }

    const label = options?.label ?? `Terminal ${nextNum}`;

    const terminal: TerminalInstance = {
      id,
      label,
      output: "",
      status: "spawning",
      isPrimary: options?.isPrimary ?? false,
    };

    state.set(projectId, {
      terminals: [...project.terminals, terminal],
      activeTerminalId: id,
    });

    set({ state });
    return id;
  },

  closeTerminal: (projectId, terminalId) => {
    const state = new Map(get().state);
    const project = state.get(projectId);
    if (!project) return;

    cleanupProcessRefs(terminalId);

    const newTerminals = project.terminals.filter((t) => t.id !== terminalId);

    let newActiveId = project.activeTerminalId;
    if (newActiveId === terminalId) {
      const closedIndex = project.terminals.findIndex(
        (t) => t.id === terminalId,
      );
      if (newTerminals.length === 0) {
        newActiveId = null;
      } else if (closedIndex >= newTerminals.length) {
        newActiveId = newTerminals[newTerminals.length - 1].id;
      } else {
        newActiveId = newTerminals[closedIndex].id;
      }
    }

    state.set(projectId, {
      ...project,
      terminals: newTerminals,
      activeTerminalId: newActiveId,
    });

    set({ state });
  },

  setActiveTerminal: (projectId, terminalId) => {
    const state = new Map(get().state);
    const project = state.get(projectId);
    if (!project) return;

    state.set(projectId, { ...project, activeTerminalId: terminalId });
    set({ state });
  },

  renameTerminal: (projectId, terminalId, label) => {
    const state = new Map(get().state);
    const project = state.get(projectId);
    if (!project) return;

    state.set(projectId, {
      ...project,
      terminals: project.terminals.map((t) =>
        t.id === terminalId ? { ...t, label } : t,
      ),
    });

    set({ state });
  },

  appendOutput: (projectId, terminalId, data) => {
    const state = new Map(get().state);
    const project = state.get(projectId);
    if (!project) return;

    state.set(projectId, {
      ...project,
      terminals: project.terminals.map((t) =>
        t.id === terminalId ? { ...t, output: t.output + data } : t,
      ),
    });

    set({ state });
  },

  setTerminalStatus: (projectId, terminalId, status) => {
    const state = new Map(get().state);
    const project = state.get(projectId);
    if (!project) return;

    state.set(projectId, {
      ...project,
      terminals: project.terminals.map((t) =>
        t.id === terminalId ? { ...t, status } : t,
      ),
    });

    set({ state });
  },

  clearAllTerminals: (projectId) => {
    const state = new Map(get().state);
    const project = state.get(projectId);
    if (!project) return;

    for (const terminal of project.terminals) {
      cleanupProcessRefs(terminal.id);
    }

    state.set(projectId, { ...defaultProjectState });
    set({ state });
  },
}));
