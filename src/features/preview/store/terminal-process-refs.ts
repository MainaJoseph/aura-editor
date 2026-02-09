import { WebContainerProcess } from "@webcontainer/api";

interface TerminalProcessRefs {
  shellProcess: WebContainerProcess;
  inputWriter: WritableStreamDefaultWriter<string>;
  outputAbortController: AbortController;
}

const processRefs = new Map<string, TerminalProcessRefs>();

export function setProcessRefs(
  terminalId: string,
  refs: TerminalProcessRefs,
): void {
  processRefs.set(terminalId, refs);
}

export function getProcessRefs(
  terminalId: string,
): TerminalProcessRefs | undefined {
  return processRefs.get(terminalId);
}

export function cleanupProcessRefs(terminalId: string): void {
  const refs = processRefs.get(terminalId);
  if (!refs) return;

  refs.outputAbortController.abort();

  try {
    refs.inputWriter.releaseLock();
  } catch {
    // Writer may already be released
  }

  try {
    refs.shellProcess.kill();
  } catch {
    // Process may already be dead
  }

  processRefs.delete(terminalId);
}

export function cleanupAllProcessRefs(): void {
  for (const terminalId of processRefs.keys()) {
    cleanupProcessRefs(terminalId);
  }
}

export function writeToProcess(terminalId: string, data: string): void {
  const refs = processRefs.get(terminalId);
  refs?.inputWriter.write(data);
}

export function resizeProcess(
  terminalId: string,
  cols: number,
  rows: number,
): void {
  const refs = processRefs.get(terminalId);
  refs?.shellProcess.resize({ cols, rows });
}
