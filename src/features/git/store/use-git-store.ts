import { create } from "zustand";

interface GitStore {
  stagedPaths: Set<string>;
  commitMessage: string;
  changeCount: number;
  diffPath: string | null;
  toggleStaged: (path: string) => void;
  stageAll: (paths: string[]) => void;
  unstageAll: () => void;
  setCommitMessage: (msg: string) => void;
  setChangeCount: (n: number) => void;
  setDiffPath: (path: string | null) => void;
  reset: () => void;
}

export const useGitStore = create<GitStore>((set) => ({
  stagedPaths: new Set(),
  commitMessage: "",
  changeCount: 0,
  diffPath: null,

  toggleStaged: (path) =>
    set((state) => {
      const next = new Set(state.stagedPaths);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return { stagedPaths: next };
    }),

  stageAll: (paths) =>
    set(() => ({ stagedPaths: new Set(paths) })),

  unstageAll: () =>
    set(() => ({ stagedPaths: new Set() })),

  setCommitMessage: (msg) =>
    set(() => ({ commitMessage: msg })),

  setChangeCount: (n) =>
    set(() => ({ changeCount: n })),

  setDiffPath: (path) =>
    set(() => ({ diffPath: path })),

  reset: () =>
    set(() => ({ stagedPaths: new Set(), commitMessage: "" })),
}));
