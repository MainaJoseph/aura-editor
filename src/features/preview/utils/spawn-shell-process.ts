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

  const shellProcess = await container.spawn("jsh", [], {
    terminal: { cols: 80, rows: 24 },
  });

  const inputWriter = shellProcess.input.getWriter();

  const outputAbortController = new AbortController();
  shellProcess.output
    .pipeTo(
      new WritableStream({
        write(data) {
          useTerminalStore.getState().appendOutput(projectId, terminalId, data);
        },
      }),
      { signal: outputAbortController.signal },
    )
    .catch(() => {
      // Stream was aborted, expected on cleanup
    });

  setProcessRefs(terminalId, {
    shellProcess,
    inputWriter,
    outputAbortController,
  });

  store.setTerminalStatus(projectId, terminalId, "running");

  shellProcess.exit.then(() => {
    useTerminalStore
      .getState()
      .setTerminalStatus(projectId, terminalId, "exited");
  });
}
