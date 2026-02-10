import { create } from "zustand";
import { nanoid } from "nanoid";

import { Id } from "../../../../convex/_generated/dataModel";

const MAX_ENTRIES = 1000;

export interface ConsoleEntry {
  id: string;
  level: "log" | "info" | "warn" | "error" | "debug";
  source: "browser" | "server";
  args: string[];
  timestamp: number;
}

interface ConsoleProjectState {
  entries: ConsoleEntry[];
}

const defaultProjectState: ConsoleProjectState = {
  entries: [],
};

interface ConsoleStore {
  state: Map<Id<"projects">, ConsoleProjectState>;
  getProjectState: (projectId: Id<"projects">) => ConsoleProjectState;
  addEntry: (
    projectId: Id<"projects">,
    entry: Omit<ConsoleEntry, "id">,
  ) => void;
  clearEntries: (projectId: Id<"projects">) => void;
}

export const useConsoleStore = create<ConsoleStore>()((set, get) => ({
  state: new Map(),

  getProjectState: (projectId) => {
    return get().state.get(projectId) ?? defaultProjectState;
  },

  addEntry: (projectId, entry) => {
    const state = new Map(get().state);
    const project = state.get(projectId) ?? { ...defaultProjectState };

    const newEntry: ConsoleEntry = {
      ...entry,
      id: nanoid(8),
      timestamp: entry.timestamp || Date.now(),
    };

    let entries = [...project.entries, newEntry];
    if (entries.length > MAX_ENTRIES) {
      entries = entries.slice(entries.length - MAX_ENTRIES);
    }

    state.set(projectId, { entries });
    set({ state });
  },

  clearEntries: (projectId) => {
    const state = new Map(get().state);
    state.set(projectId, { entries: [] });
    set({ state });
  },
}));
