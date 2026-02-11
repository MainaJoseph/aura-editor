import { v } from "convex/values";

import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { verifyAuth } from "./auth";

export const updateSettings = mutation({
  args: {
    id: v.id("projects"),
    settings: v.object({
      installCommand: v.optional(v.string()),
      devCommand: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const project = await ctx.db.get("projects", args.id);

    if (!project) {
      throw new Error("Project not found");
    }

    if (project.ownerId !== identity.subject) {
      throw new Error("Unauthorized to update this project");
    }

    await ctx.db.patch("projects", args.id, {
      settings: args.settings,
      updatedAt: Date.now(),
    });
  },
});

export const create = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const projectId = await ctx.db.insert("projects", {
      name: args.name,
      ownerId: identity.subject,
      updatedAt: Date.now(),
    });

    return projectId;
  },
});

export const getPartial = query({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    return await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
      .order("desc")
      .take(args.limit);
  },
});

export const get = query({
  args: {},
  handler: async (ctx) => {
    const identity = await verifyAuth(ctx);

    return await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
      .order("desc")
      .collect();
  },
});

export const getById = query({
  args: {
    id: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const project = await ctx.db.get("projects", args.id);

    // Return null if project doesn't exist (e.g., after deletion)
    if (!project) {
      return null;
    }

    // Return null if user doesn't own this project
    if (project.ownerId !== identity.subject) {
      return null;
    }

    return project;
  },
});

export const rename = mutation({
  args: {
    id: v.id("projects"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const project = await ctx.db.get("projects", args.id);

    if (!project) {
      throw new Error("Project not found");
    }

    if (project.ownerId !== identity.subject) {
      throw new Error("Unauthorized access to this project");
    }

    await ctx.db.patch("projects", args.id, {
      name: args.name,
      updatedAt: Date.now(),
    });
  },
});

// Batch size for deletion to stay within Convex limits
// (16,000 doc writes max, but we stay conservative)
const DELETE_BATCH_SIZE = 500;

export const deleteProject = mutation({
  args: {
    id: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const project = await ctx.db.get("projects", args.id);

    if (!project) {
      throw new Error("Project not found");
    }

    if (project.ownerId !== identity.subject) {
      throw new Error("Unauthorized: Only the project owner can delete this project");
    }

    // Delete files in batches
    const files = await ctx.db
      .query("files")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .take(DELETE_BATCH_SIZE);

    for (const file of files) {
      if (file.storageId) {
        await ctx.storage.delete(file.storageId);
      }
      await ctx.db.delete("files", file._id);
    }

    // If there are more files, schedule continuation
    if (files.length === DELETE_BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.projects.continueDeleteProject, {
        projectId: args.id,
        ownerId: identity.subject,
      });
      return;
    }

    // Delete messages in batches (query by project status index)
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_project_status", (q) => q.eq("projectId", args.id))
      .take(DELETE_BATCH_SIZE);

    for (const message of messages) {
      await ctx.db.delete("messages", message._id);
    }

    // If there are more messages, schedule continuation
    if (messages.length === DELETE_BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.projects.continueDeleteProject, {
        projectId: args.id,
        ownerId: identity.subject,
      });
      return;
    }

    // Delete conversations in batches
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .take(DELETE_BATCH_SIZE);

    for (const conversation of conversations) {
      await ctx.db.delete("conversations", conversation._id);
    }

    // If there are more conversations, schedule continuation
    if (conversations.length === DELETE_BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.projects.continueDeleteProject, {
        projectId: args.id,
        ownerId: identity.subject,
      });
      return;
    }

    // Delete installed extensions in batches
    const installedExtensions = await ctx.db
      .query("installedExtensions")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .take(DELETE_BATCH_SIZE);

    for (const ext of installedExtensions) {
      await ctx.db.delete(ext._id);
    }

    if (installedExtensions.length === DELETE_BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.projects.continueDeleteProject, {
        projectId: args.id,
        ownerId: identity.subject,
      });
      return;
    }

    // All related data deleted, now delete the project
    await ctx.db.delete("projects", args.id);
  },
});

// Internal mutation for continuing project deletion
export const continueDeleteProject = internalMutation({
  args: {
    projectId: v.id("projects"),
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get("projects", args.projectId);

    // Project already deleted
    if (!project) return;

    // Verify ownership hasn't changed
    if (project.ownerId !== args.ownerId) return;

    // Delete files in batches
    const files = await ctx.db
      .query("files")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .take(DELETE_BATCH_SIZE);

    for (const file of files) {
      if (file.storageId) {
        await ctx.storage.delete(file.storageId);
      }
      await ctx.db.delete("files", file._id);
    }

    if (files.length === DELETE_BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.projects.continueDeleteProject, {
        projectId: args.projectId,
        ownerId: args.ownerId,
      });
      return;
    }

    // Delete messages in batches
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_project_status", (q) => q.eq("projectId", args.projectId))
      .take(DELETE_BATCH_SIZE);

    for (const message of messages) {
      await ctx.db.delete("messages", message._id);
    }

    if (messages.length === DELETE_BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.projects.continueDeleteProject, {
        projectId: args.projectId,
        ownerId: args.ownerId,
      });
      return;
    }

    // Delete conversations in batches
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .take(DELETE_BATCH_SIZE);

    for (const conversation of conversations) {
      await ctx.db.delete("conversations", conversation._id);
    }

    if (conversations.length === DELETE_BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.projects.continueDeleteProject, {
        projectId: args.projectId,
        ownerId: args.ownerId,
      });
      return;
    }

    // Delete installed extensions in batches
    const installedExtensions = await ctx.db
      .query("installedExtensions")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .take(DELETE_BATCH_SIZE);

    for (const ext of installedExtensions) {
      await ctx.db.delete(ext._id);
    }

    if (installedExtensions.length === DELETE_BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.projects.continueDeleteProject, {
        projectId: args.projectId,
        ownerId: args.ownerId,
      });
      return;
    }

    // All related data deleted, now delete the project
    await ctx.db.delete("projects", args.projectId);
  },
});
