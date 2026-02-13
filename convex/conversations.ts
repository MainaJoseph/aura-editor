import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

import { verifyAuth } from "./auth";
import { requireProjectAccess } from "./members";

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    await requireProjectAccess(ctx, args.projectId, identity.subject, "editor");

    const conversationId = await ctx.db.insert("conversations", {
      projectId: args.projectId,
      title: args.title,
      updatedAt: Date.now(),
    });

    return conversationId;
  },
});

export const getById = query({
  args: {
    id: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const conversation = await ctx.db.get(args.id);
    if (!conversation) return null;

    const project = await ctx.db.get(conversation.projectId);
    if (!project) return null;

    try {
      await requireProjectAccess(ctx, conversation.projectId, identity.subject, "viewer");
    } catch {
      return null;
    }

    return conversation;
  },
});

export const getByProject = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const project = await ctx.db.get(args.projectId);
    if (!project) return [];

    try {
      await requireProjectAccess(ctx, args.projectId, identity.subject, "viewer");
    } catch {
      return [];
    }

    return await ctx.db
      .query("conversations")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();
  },
});

export const getMessages = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return [];

    const project = await ctx.db.get(conversation.projectId);
    if (!project) return [];

    try {
      await requireProjectAccess(ctx, conversation.projectId, identity.subject, "viewer");
    } catch {
      return [];
    }

    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .collect();
  },
});
