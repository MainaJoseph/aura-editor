import { useCallback, useEffect, useRef, useState } from "react";
import { WebContainer } from "@webcontainer/api";
import { useMutation } from "convex/react";

import { buildFileTree, getFilePath } from "@/features/preview/utils/file-tree";
import { spawnShellProcess } from "@/features/preview/utils/spawn-shell-process";
import { useFiles } from "@/features/projects/hooks/use-files";
import { useTerminalStore } from "@/features/preview/store/use-terminal-store";
import {
  cleanupAllProcessRefs,
  writeToProcess,
} from "@/features/preview/store/terminal-process-refs";

import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

// Files/folders to ignore when syncing from WebContainer
const IGNORED_PATHS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".cache",
  ".vite",
  "dist",
  "build",
  ".turbo",
  ".vercel",
  ".svelte-kit",
  ".nuxt",
  ".output",
  "coverage",
  ".parcel-cache",
  ".DS_Store",
  "thumbs.db",
]);

// Singleton WebContainer instance
let webcontainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

const getWebContainer = async (): Promise<WebContainer> => {
  if (webcontainerInstance) {
    return webcontainerInstance;
  }

  if (!bootPromise) {
    bootPromise = WebContainer.boot({ coep: "credentialless" });
  }

  webcontainerInstance = await bootPromise;
  return webcontainerInstance;
};

const teardownWebContainer = () => {
  if (webcontainerInstance) {
    webcontainerInstance.teardown();
    webcontainerInstance = null;
  }
  bootPromise = null;
};

interface UseWebContainerProps {
  projectId: Id<"projects">;
  enabled: boolean;
  settings?: {
    installCommand?: string;
    devCommand?: string;
  };
}

export const useWebContainer = ({
  projectId,
  enabled,
  settings,
}: UseWebContainerProps) => {
  const [status, setStatus] = useState<
    "idle" | "booting" | "ready" | "error"
  >("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restartKey, setRestartKey] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const containerRef = useRef<WebContainer | null>(null);
  const hasStartedRef = useRef(false);

  // Convex mutation for syncing files
  const syncFile = useMutation(api.files.syncFileFromContainer);

  // Fetch files from Convex (auto-updates on changes)
  const files = useFiles(projectId);

  // Expose container ref for terminal management
  const getContainer = useCallback(() => containerRef.current, []);

  // Initial boot and mount
  useEffect(() => {
    // Allow boot even with no files (empty project) - users can create files via terminal
    if (!enabled || files === undefined || hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;

    // Track if effect is still active (for cleanup)
    let isActive = true;
    let commandTimeoutId: NodeJS.Timeout | undefined;

    const start = async () => {
      try {
        setStatus("booting");
        setError(null);

        const container = await getWebContainer();

        // Check if effect was cleaned up during async operation
        if (!isActive) return;

        containerRef.current = container;

        // Mount files if any exist, otherwise mount empty filesystem
        if (files && files.length > 0) {
          const fileTree = buildFileTree(files);
          await container.mount(fileTree);
        }

        // Check again after mount
        if (!isActive) return;

        // Listen for server-ready to show preview
        const serverReadyHandler = (_port: number, url: string) => {
          if (isActive) {
            setPreviewUrl(url);
          }
        };
        container.on("server-ready", serverReadyHandler);

        // Create and spawn the primary terminal
        const terminalId = useTerminalStore
          .getState()
          .createTerminal(projectId, {
            label: "Terminal 1",
            isPrimary: true,
          });

        if (!isActive || !terminalId) return;

        await spawnShellProcess(container, terminalId, projectId);

        if (!isActive) return;

        setStatus("ready");

        // Only auto-run commands if there are files (has package.json likely)
        if (files && files.length > 0) {
          const installCmd = settings?.installCommand || "npm install";
          // Use --turbo=false because Turbopack native bindings don't work in WebContainer
          const devCmd =
            settings?.devCommand || "npm run dev -- --turbo=false";

          // Send commands to shell (with small delay for shell to initialize)
          commandTimeoutId = setTimeout(() => {
            if (isActive) {
              writeToProcess(terminalId, `${installCmd} && ${devCmd}\n`);
            }
          }, 100);
        }
      } catch (error) {
        if (isActive) {
          setError(error instanceof Error ? error.message : "Unknown error");
          setStatus("error");
        }
      }
    };

    start();

    // Cleanup function
    return () => {
      isActive = false;

      // Clear the command timeout
      if (commandTimeoutId) {
        clearTimeout(commandTimeoutId);
      }

      // Note: We don't teardown the WebContainer here because it's a singleton
      // and may be reused. The restart() function handles full cleanup.
    };
  }, [
    enabled,
    files,
    restartKey,
    projectId,
    settings?.devCommand,
    settings?.installCommand,
  ]);

  // Sync file changes from Convex to WebContainer (hot-reload)
  // Only sync when NOT currently syncing from WebContainer to Convex
  // to prevent infinite loop
  const isWritingToContainerRef = useRef(false);
  const lastSyncedFilesRef = useRef<string>("");

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !files || status !== "ready") return;

    // Create a hash of current files to detect real changes
    const filesHash = JSON.stringify(
      files
        .filter((f) => f.type === "file" && !f.storageId && f.content)
        .map((f) => ({ id: f._id, content: f.content, updatedAt: f.updatedAt }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    );

    // Skip if files haven't actually changed (prevents loop)
    if (filesHash === lastSyncedFilesRef.current) return;
    lastSyncedFilesRef.current = filesHash;

    isWritingToContainerRef.current = true;

    const filesMap = new Map(files.map((f) => [f._id, f]));

    const writeFiles = async () => {
      for (const file of files) {
        if (file.type !== "file" || file.storageId || !file.content) continue;

        const filePath = getFilePath(file, filesMap);
        try {
          await container.fs.writeFile(filePath, file.content);
        } catch {
          // File might not exist yet, ignore
        }
      }
      // Small delay before allowing watcher to trigger again
      setTimeout(() => {
        isWritingToContainerRef.current = false;
      }, 500);
    };

    writeFiles();
  }, [files, status]);

  // Reset when disabled
  useEffect(() => {
    if (!enabled) {
      hasStartedRef.current = false;
      setStatus("idle");
      setPreviewUrl(null);
      setError(null);
    }
  }, [enabled]);

  // Restart the entire WebContainer process
  const restart = useCallback(() => {
    // Cleanup all terminal processes
    cleanupAllProcessRefs();
    useTerminalStore.getState().clearAllTerminals(projectId);

    teardownWebContainer();
    containerRef.current = null;
    hasStartedRef.current = false;
    setStatus("idle");
    setPreviewUrl(null);
    setError(null);
    setRestartKey((k) => k + 1);
  }, [projectId]);

  // Recursively read all files from WebContainer
  const readAllFiles = useCallback(
    async (
      container: WebContainer,
      dirPath: string = "/",
    ): Promise<Array<{ path: string; content: string; type: "file" | "folder" }>> => {
      const results: Array<{ path: string; content: string; type: "file" | "folder" }> = [];

      try {
        const entries = await container.fs.readdir(dirPath, {
          withFileTypes: true,
        });

        for (const entry of entries) {
          const name = typeof entry === "string" ? entry : entry.name;
          const isDirectory =
            typeof entry === "string" ? false : entry.isDirectory();

          // Skip ignored paths
          if (IGNORED_PATHS.has(name)) continue;

          const fullPath =
            dirPath === "/" ? `/${name}` : `${dirPath}/${name}`;
          const relativePath = fullPath.startsWith("/")
            ? fullPath.slice(1)
            : fullPath;

          if (isDirectory) {
            results.push({ path: relativePath, content: "", type: "folder" });
            // Recursively read subdirectory
            const subFiles = await readAllFiles(container, fullPath);
            results.push(...subFiles);
          } else {
            try {
              const content = await container.fs.readFile(fullPath, "utf-8");
              results.push({ path: relativePath, content, type: "file" });
            } catch {
              // Skip files that can't be read (binary, etc.)
            }
          }
        }
      } catch {
        // Directory might not exist or be readable
      }

      return results;
    },
    [],
  );

  // Sync all files from WebContainer to Convex
  const syncFilesToConvex = useCallback(async () => {
    const container = containerRef.current;
    if (!container || isSyncing) return;

    setIsSyncing(true);

    try {
      const containerFiles = await readAllFiles(container);

      // Sync each file to Convex
      for (const file of containerFiles) {
        await syncFile({
          projectId,
          path: file.path,
          content: file.content,
          type: file.type,
        });
      }
    } catch (error) {
      console.error("Error syncing files:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [projectId, readAllFiles, syncFile, isSyncing]);

  // Note: Automatic file watching has been disabled to prevent sync loops.
  // Files from WebContainer are synced to Convex only when user clicks
  // the sync button manually. This prevents the dev server from restarting
  // constantly due to bi-directional sync loops.

  return {
    status,
    previewUrl,
    error,
    restart,
    getContainer,
    syncFilesToConvex,
    isSyncing,
  };
};
