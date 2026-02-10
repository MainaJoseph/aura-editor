import { useCallback, useEffect } from "react";

import {
  useConsoleStore,
  ConsoleEntry,
} from "@/features/preview/store/use-console-store";

import { Id } from "../../../../convex/_generated/dataModel";

interface UseConsoleProps {
  projectId: Id<"projects">;
}

interface UseConsoleReturn {
  entries: ConsoleEntry[];
  clearEntries: () => void;
}

export const useConsole = ({ projectId }: UseConsoleProps): UseConsoleReturn => {
  const entries = useConsoleStore(
    (s) => s.getProjectState(projectId).entries,
  );

  // Listen for postMessage from iframe (browser console bridge)
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type !== "aura:console") return;

      const { level, args, timestamp } = event.data;

      useConsoleStore.getState().addEntry(projectId, {
        level: level || "log",
        source: "browser",
        args: Array.isArray(args) ? args : [String(args)],
        timestamp: timestamp || Date.now(),
      });
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [projectId]);

  const clearEntries = useCallback(() => {
    useConsoleStore.getState().clearEntries(projectId);
  }, [projectId]);

  return { entries, clearEntries };
};
