import { v } from "convex/values";
import * as Y from "yjs";

import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { verifyAuth } from "./auth";
import { requireProjectAccess } from "./members";

const COMPACT_THRESHOLD = 50;

export const pushUpdate = mutation({
  args: {
    fileId: v.id("files"),
    data: v.bytes(),
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const file = await ctx.db.get(args.fileId);
    if (!file) throw new Error("File not found");

    await requireProjectAccess(ctx, file.projectId, identity.subject, "editor");

    // Determine next sequence number
    const latestSnapshot = await ctx.db
      .query("yjsSnapshots")
      .withIndex("by_file", (q) => q.eq("fileId", args.fileId))
      .order("desc")
      .first();

    const latestUpdate = await ctx.db
      .query("yjsUpdates")
      .withIndex("by_file_seq", (q) => q.eq("fileId", args.fileId))
      .order("desc")
      .first();

    const maxSeq = Math.max(
      latestSnapshot?.sequenceNum ?? 0,
      latestUpdate?.sequenceNum ?? 0,
    );

    const sequenceNum = maxSeq + 1;

    await ctx.db.insert("yjsUpdates", {
      fileId: args.fileId,
      data: args.data,
      clientId: args.clientId,
      sequenceNum,
      createdAt: Date.now(),
    });

    // Count pending updates since last snapshot
    const snapshotSeq = latestSnapshot?.sequenceNum ?? 0;
    const pendingCount = sequenceNum - snapshotSeq;

    if (pendingCount >= COMPACT_THRESHOLD) {
      await ctx.scheduler.runAfter(0, internal.yjs.compact, {
        fileId: args.fileId,
      });
    }

    return sequenceNum;
  },
});

export const getUpdates = query({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const file = await ctx.db.get(args.fileId);
    if (!file) return null;

    try {
      await requireProjectAccess(ctx, file.projectId, identity.subject, "viewer");
    } catch {
      return null;
    }

    // Get latest snapshot
    const snapshot = await ctx.db
      .query("yjsSnapshots")
      .withIndex("by_file", (q) => q.eq("fileId", args.fileId))
      .order("desc")
      .first();

    const sinceSeq = snapshot?.sequenceNum ?? 0;

    // Get all updates after snapshot
    const updates = await ctx.db
      .query("yjsUpdates")
      .withIndex("by_file_seq", (q) =>
        q.eq("fileId", args.fileId).gt("sequenceNum", sinceSeq),
      )
      .collect();

    return {
      snapshot: snapshot
        ? { data: snapshot.data, sequenceNum: snapshot.sequenceNum }
        : null,
      updates: updates.map((u) => ({
        data: u.data,
        sequenceNum: u.sequenceNum,
        clientId: u.clientId,
      })),
    };
  },
});

export const compact = internalMutation({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file) return;

    // Get latest snapshot
    const oldSnapshot = await ctx.db
      .query("yjsSnapshots")
      .withIndex("by_file", (q) => q.eq("fileId", args.fileId))
      .order("desc")
      .first();

    const sinceSeq = oldSnapshot?.sequenceNum ?? 0;

    // Get all updates after snapshot
    const updates = await ctx.db
      .query("yjsUpdates")
      .withIndex("by_file_seq", (q) =>
        q.eq("fileId", args.fileId).gt("sequenceNum", sinceSeq),
      )
      .collect();

    if (updates.length === 0) return;

    // Build Y.Doc from snapshot + updates
    const doc = new Y.Doc();

    if (oldSnapshot) {
      Y.applyUpdate(doc, new Uint8Array(oldSnapshot.data));
    }

    for (const update of updates) {
      Y.applyUpdate(doc, new Uint8Array(update.data));
    }

    // Create new snapshot
    const snapshotData = Y.encodeStateAsUpdate(doc);
    const maxSeq = updates[updates.length - 1].sequenceNum;

    await ctx.db.insert("yjsSnapshots", {
      fileId: args.fileId,
      data: snapshotData.buffer as ArrayBuffer,
      sequenceNum: maxSeq,
      createdAt: Date.now(),
    });

    // Delete old updates
    for (const update of updates) {
      await ctx.db.delete(update._id);
    }

    // Delete old snapshot
    if (oldSnapshot) {
      await ctx.db.delete(oldSnapshot._id);
    }

    // Sync back to files.content for backward compatibility
    const text = doc.getText("content").toString();
    await ctx.db.patch(args.fileId, {
      content: text,
      updatedAt: Date.now(),
    });

    doc.destroy();
  },
});

export const syncContentToFile = mutation({
  args: {
    fileId: v.id("files"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const file = await ctx.db.get(args.fileId);
    if (!file) throw new Error("File not found");

    await requireProjectAccess(ctx, file.projectId, identity.subject, "editor");

    await ctx.db.patch(args.fileId, {
      content: args.content,
      updatedAt: Date.now(),
    });
  },
});

// Called from system.ts when AI agent updates a file that has active Yjs data
export const pushContentAsUpdate = internalMutation({
  args: {
    fileId: v.id("files"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file) return;

    // Build current Yjs state
    const doc = new Y.Doc();

    const snapshot = await ctx.db
      .query("yjsSnapshots")
      .withIndex("by_file", (q) => q.eq("fileId", args.fileId))
      .order("desc")
      .first();

    if (snapshot) {
      Y.applyUpdate(doc, new Uint8Array(snapshot.data));
    }

    const sinceSeq = snapshot?.sequenceNum ?? 0;

    const updates = await ctx.db
      .query("yjsUpdates")
      .withIndex("by_file_seq", (q) =>
        q.eq("fileId", args.fileId).gt("sequenceNum", sinceSeq),
      )
      .collect();

    for (const update of updates) {
      Y.applyUpdate(doc, new Uint8Array(update.data));
    }

    // Replace content as a transaction
    const yText = doc.getText("content");
    doc.transact(() => {
      yText.delete(0, yText.length);
      yText.insert(0, args.content);
    });

    // Get the update from the transaction
    const fullUpdate = Y.encodeStateAsUpdate(doc);

    // Determine next sequence number
    const maxSeq = Math.max(
      snapshot?.sequenceNum ?? 0,
      updates.length > 0 ? updates[updates.length - 1].sequenceNum : 0,
    );

    await ctx.db.insert("yjsUpdates", {
      fileId: args.fileId,
      data: fullUpdate.buffer as ArrayBuffer,
      clientId: "ai-agent",
      sequenceNum: maxSeq + 1,
      createdAt: Date.now(),
    });

    doc.destroy();
  },
});
