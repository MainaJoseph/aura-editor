import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { verifyAuth } from "./auth";

export const getMarketplaceExtensions = query({
  args: {
    category: v.optional(
      v.union(
        v.literal("themes"),
        v.literal("languages"),
        v.literal("formatters"),
        v.literal("ai"),
        v.literal("productivity"),
        v.literal("snippets"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx);

    if (args.category) {
      return await ctx.db
        .query("extensions")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .collect();
    }

    return await ctx.db.query("extensions").collect();
  },
});

export const getExtensionBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx);

    return await ctx.db
      .query("extensions")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

export const getInstalledExtensions = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const project = await ctx.db.get(args.projectId);
    if (!project || project.ownerId !== identity.subject) {
      return [];
    }

    const installed = await ctx.db
      .query("installedExtensions")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const results = await Promise.all(
      installed.map(async (inst) => {
        const extension = await ctx.db.get(inst.extensionId);
        if (!extension) return null;
        return {
          ...inst,
          extension,
        };
      }),
    );

    return results.filter(Boolean);
  },
});

export const installExtension = mutation({
  args: {
    projectId: v.id("projects"),
    extensionId: v.id("extensions"),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const project = await ctx.db.get(args.projectId);
    if (!project || project.ownerId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    // Check for duplicate
    const existing = await ctx.db
      .query("installedExtensions")
      .withIndex("by_project_extension", (q) =>
        q.eq("projectId", args.projectId).eq("extensionId", args.extensionId),
      )
      .first();

    if (existing) {
      throw new Error("Extension already installed");
    }

    // Verify extension exists
    const extension = await ctx.db.get(args.extensionId);
    if (!extension) {
      throw new Error("Extension not found");
    }

    await ctx.db.insert("installedExtensions", {
      projectId: args.projectId,
      extensionId: args.extensionId,
      enabled: true,
      installedAt: Date.now(),
    });

    // Increment download count
    await ctx.db.patch(args.extensionId, {
      downloads: extension.downloads + 1,
    });
  },
});

export const uninstallExtension = mutation({
  args: {
    projectId: v.id("projects"),
    extensionId: v.id("extensions"),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const project = await ctx.db.get(args.projectId);
    if (!project || project.ownerId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    const installed = await ctx.db
      .query("installedExtensions")
      .withIndex("by_project_extension", (q) =>
        q.eq("projectId", args.projectId).eq("extensionId", args.extensionId),
      )
      .first();

    if (installed) {
      await ctx.db.delete(installed._id);
    }
  },
});

export const toggleExtension = mutation({
  args: {
    projectId: v.id("projects"),
    extensionId: v.id("extensions"),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const project = await ctx.db.get(args.projectId);
    if (!project || project.ownerId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    const installed = await ctx.db
      .query("installedExtensions")
      .withIndex("by_project_extension", (q) =>
        q.eq("projectId", args.projectId).eq("extensionId", args.extensionId),
      )
      .first();

    if (!installed) {
      throw new Error("Extension not installed");
    }

    await ctx.db.patch(installed._id, { enabled: args.enabled });
  },
});
