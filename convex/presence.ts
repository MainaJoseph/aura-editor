import { v } from "convex/values";

import { internalMutation, mutation, query } from "./_generated/server";
import { verifyAuth } from "./auth";
import { requireProjectAccess } from "./members";

const PRESENCE_TIMEOUT_MS = 30_000; // 30 seconds
const STALE_TIMEOUT_MS = 60_000; // 60 seconds

export const updatePresence = mutation({
  args: {
    projectId: v.id("projects"),
    fileId: v.optional(v.id("files")),
    userName: v.string(),
    userColor: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    try {
      await requireProjectAccess(ctx, args.projectId, identity.subject, "viewer");
    } catch {
      return;
    }

    // Upsert presence
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_project_user", (q) =>
        q.eq("projectId", args.projectId).eq("userId", identity.subject),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        fileId: args.fileId,
        userName: args.userName,
        userColor: args.userColor,
        lastSeen: Date.now(),
      });
    } else {
      await ctx.db.insert("presence", {
        projectId: args.projectId,
        userId: identity.subject,
        fileId: args.fileId,
        userName: args.userName,
        userColor: args.userColor,
        lastSeen: Date.now(),
      });
    }
  },
});

export const getProjectPresence = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    try {
      await requireProjectAccess(ctx, args.projectId, identity.subject, "viewer");
    } catch {
      return [];
    }

    const entries = await ctx.db
      .query("presence")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const cutoff = Date.now() - PRESENCE_TIMEOUT_MS;

    // Filter to active entries (excluding current user)
    return entries.filter(
      (entry) =>
        entry.lastSeen > cutoff && entry.userId !== identity.subject,
    );
  },
});

export const removePresence = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const existing = await ctx.db
      .query("presence")
      .withIndex("by_project_user", (q) =>
        q.eq("projectId", args.projectId).eq("userId", identity.subject),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

export const cleanupStalePresence = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - STALE_TIMEOUT_MS;

    // We can't filter by lastSeen via index, so collect and filter
    // This is acceptable because presence is a small table
    const allPresence = await ctx.db.query("presence").collect();

    for (const entry of allPresence) {
      if (entry.lastSeen < cutoff) {
        await ctx.db.delete(entry._id);
      }
    }
  },
});
