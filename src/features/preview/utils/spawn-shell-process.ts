import { WebContainer } from "@webcontainer/api";

import { setProcessRefs } from "@/features/preview/store/terminal-process-refs";
import { useTerminalStore } from "@/features/preview/store/use-terminal-store";

import { Id } from "../../../../convex/_generated/dataModel";

export async function spawnShellProcess(
  container: WebContainer,
  terminalId: string,
  projectId: Id<"projects">,
): Promise<void> {
  const store = useTerminalStore.getState();

  store.setTerminalStatus(projectId, terminalId, "spawning");

  try {
    const shellProcess = await container.spawn("jsh", [], {
      terminal: { cols: 80, rows: 24 },
    });

    const inputWriter = shellProcess.input.getWriter();

    // Batch output chunks to reduce store update frequency
    const FLUSH_INTERVAL = 16;
    const FLUSH_SIZE_THRESHOLD = 8_192;
    let outputBuffer = "";
    let flushTimer: ReturnType<typeof setTimeout> | null = null;

    const flushOutput = () => {
      flushTimer = null;
      if (outputBuffer) {
        const data = outputBuffer;
        outputBuffer = "";
        useTerminalStore.getState().appendOutput(projectId, terminalId, data);
      }
    };

    const scheduleFlush = () => {
      if (flushTimer === null) {
        flushTimer = setTimeout(flushOutput, FLUSH_INTERVAL);
      }
    };

    const outputAbortController = new AbortController();
    shellProcess.output
      .pipeTo(
        new WritableStream({
          write(data) {
            outputBuffer += data;
            if (outputBuffer.length >= FLUSH_SIZE_THRESHOLD) {
              if (flushTimer !== null) {
                clearTimeout(flushTimer);
                flushTimer = null;
              }
              flushOutput();
            } else {
              scheduleFlush();
            }
          },
        }),
        { signal: outputAbortController.signal },
      )
      .catch(() => {
        // Stream was aborted, expected on cleanup
        // Flush any remaining buffered output
        flushOutput();
      });

    setProcessRefs(terminalId, {
      shellProcess,
      inputWriter,
      outputAbortController,
    });

    store.setTerminalStatus(projectId, terminalId, "running");

    shellProcess.exit.then(() => {
      flushOutput();
      useTerminalStore
        .getState()
        .setTerminalStatus(projectId, terminalId, "exited");
    });
  } catch {
    useTerminalStore
      .getState()
      .setTerminalStatus(projectId, terminalId, "exited");
  }
}
