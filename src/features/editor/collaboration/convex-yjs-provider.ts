import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import type { ConvexReactClient } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

const BATCH_INTERVAL_MS = 100;
const SYNC_TO_FILE_INTERVAL_MS = 2000;
const PRESENCE_HEARTBEAT_MS = 5000;

export interface PresenceConfig {
  projectId: Id<"projects">;
  userName: string;
  userColor: string;
}

export class ConvexYjsProvider {
  doc: Y.Doc;
  awareness: Awareness;

  private convex: ConvexReactClient;
  private fileId: Id<"files">;
  private clientId: string;
  private lastSeq = 0;
  private isApplyingRemote = false;
  private pendingUpdates: Uint8Array[] = [];
  private batchTimer: ReturnType<typeof setTimeout> | null = null;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private presenceTimer: ReturnType<typeof setInterval> | null = null;
  private presenceConfig: PresenceConfig | null = null;
  private unsubscribe: (() => void) | null = null;
  private destroyed = false;
  private _synced = false;
  private syncListeners: Set<(synced: boolean) => void> = new Set();

  constructor(
    convex: ConvexReactClient,
    fileId: Id<"files">,
    initialContent?: string,
  ) {
    this.convex = convex;
    this.fileId = fileId;
    this.clientId = Math.random().toString(36).substring(2, 15);
    this.doc = new Y.Doc();
    this.awareness = new Awareness(this.doc);

    // Listen for local changes
    this.doc.on("update", this.handleLocalUpdate);

    // Subscribe to remote updates via Convex query
    this.subscribeToUpdates(initialContent);

    // Periodically sync content to files table
    this.syncTimer = setInterval(() => {
      this.syncToFileContent();
    }, SYNC_TO_FILE_INTERVAL_MS);
  }

  setPresence(config: PresenceConfig) {
    this.presenceConfig = config;

    // Set local awareness state
    this.awareness.setLocalStateField("user", {
      name: config.userName,
      color: config.userColor,
      colorLight: config.userColor + "40",
    });

    // Start presence heartbeat
    this.sendPresenceHeartbeat();
    if (this.presenceTimer) clearInterval(this.presenceTimer);
    this.presenceTimer = setInterval(() => {
      this.sendPresenceHeartbeat();
    }, PRESENCE_HEARTBEAT_MS);
  }

  private async sendPresenceHeartbeat() {
    if (this.destroyed || !this.presenceConfig) return;

    try {
      await this.convex.mutation(api.presence.updatePresence, {
        projectId: this.presenceConfig.projectId,
        fileId: this.fileId,
        userName: this.presenceConfig.userName,
        userColor: this.presenceConfig.userColor,
      });
    } catch {
      // Silently fail
    }
  }

  get synced() {
    return this._synced;
  }

  onSynced(listener: (synced: boolean) => void) {
    this.syncListeners.add(listener);
    return () => {
      this.syncListeners.delete(listener);
    };
  }

  private setSynced(synced: boolean) {
    if (this._synced !== synced) {
      this._synced = synced;
      this.syncListeners.forEach((l) => l(synced));
    }
  }

  private handleLocalUpdate = (update: Uint8Array) => {
    if (this.isApplyingRemote || this.destroyed) return;

    this.pendingUpdates.push(update);

    if (this.batchTimer) clearTimeout(this.batchTimer);
    this.batchTimer = setTimeout(() => {
      this.flushPendingUpdates();
    }, BATCH_INTERVAL_MS);
  };

  private async flushPendingUpdates() {
    if (this.pendingUpdates.length === 0 || this.destroyed) return;

    const merged = Y.mergeUpdates(this.pendingUpdates);
    this.pendingUpdates = [];

    try {
      const seq = await this.convex.mutation(api.yjs.pushUpdate, {
        fileId: this.fileId,
        data: merged.buffer as ArrayBuffer,
        clientId: this.clientId,
      });
      if (seq) {
        this.lastSeq = Math.max(this.lastSeq, seq);
      }
    } catch (err) {
      console.error("Failed to push Yjs update:", err);
    }
  }

  private subscribeToUpdates(initialContent?: string) {
    let initialized = false;

    const watch = this.convex.watchQuery(api.yjs.getUpdates, {
      fileId: this.fileId,
    });

    const handleUpdate = () => {
      if (this.destroyed) return;

      const result = watch.localQueryResult();
      if (result === undefined) return; // Not loaded yet
      if (result === null) return; // No access

      if (!initialized) {
        initialized = true;

        // If no Yjs history exists, initialize from content
        if (!result.snapshot && result.updates.length === 0) {
          if (initialContent) {
            this.doc.transact(() => {
              this.doc.getText("content").insert(0, initialContent);
            });
          }
          this.setSynced(true);
          return;
        }

        // Apply snapshot
        if (result.snapshot) {
          this.isApplyingRemote = true;
          Y.applyUpdate(this.doc, new Uint8Array(result.snapshot.data));
          this.lastSeq = result.snapshot.sequenceNum;
          this.isApplyingRemote = false;
        }

        // Apply all updates
        for (const update of result.updates) {
          if (update.sequenceNum > this.lastSeq) {
            this.isApplyingRemote = true;
            Y.applyUpdate(this.doc, new Uint8Array(update.data));
            this.lastSeq = update.sequenceNum;
            this.isApplyingRemote = false;
          }
        }

        this.setSynced(true);
        return;
      }

      // Subsequent updates — apply only new ones
      const newUpdates = result.updates.filter(
        (u) => u.sequenceNum > this.lastSeq && u.clientId !== this.clientId,
      );

      if (result.snapshot && result.snapshot.sequenceNum > this.lastSeq) {
        // A new snapshot was created, apply it
        this.isApplyingRemote = true;
        Y.applyUpdate(this.doc, new Uint8Array(result.snapshot.data));
        this.lastSeq = result.snapshot.sequenceNum;
        this.isApplyingRemote = false;
      }

      for (const update of newUpdates) {
        if (update.sequenceNum > this.lastSeq) {
          this.isApplyingRemote = true;
          Y.applyUpdate(this.doc, new Uint8Array(update.data));
          this.lastSeq = update.sequenceNum;
          this.isApplyingRemote = false;
        }
      }
    };

    this.unsubscribe = watch.onUpdate(handleUpdate);

    // Check if there's already a result available
    handleUpdate();
  }

  private async syncToFileContent() {
    if (this.destroyed) return;

    const text = this.doc.getText("content").toString();
    try {
      await this.convex.mutation(api.yjs.syncContentToFile, {
        fileId: this.fileId,
        content: text,
      });
    } catch {
      // Silently fail — the file content will be synced on next attempt or compact
    }
  }

  async destroy() {
    this.destroyed = true;

    // Flush any pending updates
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    await this.flushPendingUpdates();

    // Final sync to file content
    await this.syncToFileContent();

    // Remove presence
    if (this.presenceConfig) {
      try {
        await this.convex.mutation(api.presence.removePresence, {
          projectId: this.presenceConfig.projectId,
        });
      } catch {
        // Silently fail
      }
    }

    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    if (this.presenceTimer) {
      clearInterval(this.presenceTimer);
      this.presenceTimer = null;
    }

    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    this.doc.off("update", this.handleLocalUpdate);
    this.awareness.destroy();
    this.doc.destroy();
    this.syncListeners.clear();
  }
}
