import { v } from "convex/values";

import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { verifyAuth } from "./auth";
import { requireProjectAccess } from "./members";

export const updateGitState = mutation({
  args: {
    id: v.id("projects"),
    gitRepo: v.optional(v.string()),
    gitBranch: v.optional(v.string()),
    gitLastCommitSha: v.optional(v.string()),
    gitSyncStatus: v.optional(
      v.union(
        v.literal("committing"),
        v.literal("pulling"),
        v.literal("connecting"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const project = await ctx.db.get(args.id);
    if (!project) throw new Error("Project not found");

    await requireProjectAccess(ctx, args.id, identity.subject, "editor");

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.gitRepo !== undefined) patch.gitRepo = args.gitRepo;
    if (args.gitBranch !== undefined) patch.gitBranch = args.gitBranch;
    if (args.gitLastCommitSha !== undefined) patch.gitLastCommitSha = args.gitLastCommitSha;
    if (args.gitSyncStatus !== undefined) patch.gitSyncStatus = args.gitSyncStatus;

    await ctx.db.patch(args.id, patch);
  },
});

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

    const project = await ctx.db.get(args.id);
    if (!project) throw new Error("Project not found");

    await requireProjectAccess(ctx, args.id, identity.subject, "editor");

    await ctx.db.patch(args.id, {
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

    // Get owned projects
    const ownedProjects = await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
      .order("desc")
      .collect();

    // Get projects where user is a member
    const memberships = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    const memberProjects = await Promise.all(
      memberships.map((m) => ctx.db.get(m.projectId)),
    );

    const validMemberProjects = memberProjects.filter(
      (p): p is NonNullable<typeof p> =>
        p !== null && p.ownerId !== identity.subject,
    );

    // Combine, deduplicate, sort by updatedAt desc, and take limit
    const allProjects = [...ownedProjects, ...validMemberProjects];
    allProjects.sort((a, b) => b.updatedAt - a.updatedAt);

    return allProjects.slice(0, args.limit);
  },
});

export const get = query({
  args: {},
  handler: async (ctx) => {
    const identity = await verifyAuth(ctx);

    // Get owned projects
    const ownedProjects = await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
      .order("desc")
      .collect();

    // Get projects where user is a member
    const memberships = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    const memberProjects = await Promise.all(
      memberships.map((m) => ctx.db.get(m.projectId)),
    );

    const validMemberProjects = memberProjects.filter(
      (p): p is NonNullable<typeof p> =>
        p !== null && p.ownerId !== identity.subject,
    );

    // Combine and sort by updatedAt desc
    const allProjects = [...ownedProjects, ...validMemberProjects];
    allProjects.sort((a, b) => b.updatedAt - a.updatedAt);

    return allProjects;
  },
});

export const getById = query({
  args: {
    id: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const project = await ctx.db.get(args.id);
    if (!project) return null;

    try {
      await requireProjectAccess(ctx, args.id, identity.subject, "viewer");
    } catch {
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

    const project = await ctx.db.get(args.id);
    if (!project) throw new Error("Project not found");

    await requireProjectAccess(ctx, args.id, identity.subject, "editor");

    await ctx.db.patch(args.id, {
      name: args.name,
      updatedAt: Date.now(),
    });
  },
});

// Batch size for deletion to stay within Convex limits
const DELETE_BATCH_SIZE = 500;

export const deleteProject = mutation({
  args: {
    id: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const project = await ctx.db.get(args.id);
    if (!project) throw new Error("Project not found");

    await requireProjectAccess(ctx, args.id, identity.subject, "owner");

    if (project.isDemoTemplate) {
      throw new Error("Cannot delete the demo template project");
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
      await ctx.db.delete(file._id);
    }

    if (files.length === DELETE_BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.projects.continueDeleteProject, {
        projectId: args.id,
        ownerId: identity.subject,
      });
      return;
    }

    // Delete messages in batches
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_project_status", (q) => q.eq("projectId", args.id))
      .take(DELETE_BATCH_SIZE);

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

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
      await ctx.db.delete(conversation._id);
    }

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

    // Delete members
    const members = await ctx.db
      .query("members")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();

    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    // Delete invite links
    const inviteLinks = await ctx.db
      .query("inviteLinks")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();

    for (const link of inviteLinks) {
      await ctx.db.delete(link._id);
    }

    // Delete email invites
    const emailInvites = await ctx.db
      .query("emailInvites")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();

    for (const invite of emailInvites) {
      await ctx.db.delete(invite._id);
    }

    // Delete presence entries
    const presenceEntries = await ctx.db
      .query("presence")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();

    for (const entry of presenceEntries) {
      await ctx.db.delete(entry._id);
    }

    // All related data deleted, now delete the project
    await ctx.db.delete(args.id);
  },
});

export const markAsDemoTemplate = internalMutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    await ctx.db.patch(args.projectId, { isDemoTemplate: true });
    return { success: true, name: project.name };
  },
});

export const getUserDemoProject = query({
  args: {},
  handler: async (ctx) => {
    const identity = await verifyAuth(ctx);

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
      .collect();

    return projects.find((p) => p.isDemo === true) ?? null;
  },
});

export const cloneDemoProject = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await verifyAuth(ctx);
    const userId = identity.subject;

    // Idempotency guard: return existing demo project if user already has one
    const existingProjects = await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();

    const existingDemo = existingProjects.find((p) => p.isDemo === true);
    if (existingDemo) {
      return { projectId: existingDemo._id };
    }

    // Find the demo template via index (avoids full table scan)
    const template = await ctx.db
      .query("projects")
      .withIndex("by_demo_template", (q) => q.eq("isDemoTemplate", true))
      .first();

    if (!template) {
      return { error: "no_template" as const };
    }

    const now = Date.now();

    // Create the new project (copy settings from template)
    const newProjectId = await ctx.db.insert("projects", {
      name: "Nexora",
      ownerId: userId,
      isDemo: true,
      updatedAt: now,
      ...(template.settings ? { settings: template.settings } : {}),
    });

    // Fetch all template files
    const templateFiles = await ctx.db
      .query("files")
      .withIndex("by_project", (q) => q.eq("projectId", template._id))
      .collect();

    // Calculate depth for each file (root = 0)
    const getDepth = (
      fileId: string,
      filesById: Map<string, (typeof templateFiles)[0]>,
      cache: Map<string, number>,
    ): number => {
      if (cache.has(fileId)) return cache.get(fileId)!;
      const file = filesById.get(fileId);
      if (!file || !file.parentId) {
        cache.set(fileId, 0);
        return 0;
      }
      const depth = 1 + getDepth(file.parentId, filesById, cache);
      cache.set(fileId, depth);
      return depth;
    };

    const filesById = new Map(templateFiles.map((f) => [f._id, f]));
    const depthCache = new Map<string, number>();
    const sortedFiles = [...templateFiles].sort(
      (a, b) =>
        getDepth(a._id, filesById, depthCache) -
        getDepth(b._id, filesById, depthCache),
    );

    const idMap = new Map<string, string>();

    // Pass 1: create folders top-down
    for (const file of sortedFiles) {
      if (file.type !== "folder") continue;
      const newParentId = file.parentId
        ? (idMap.get(file.parentId) as Id<"files"> | undefined)
        : undefined;
      const newId = await ctx.db.insert("files", {
        projectId: newProjectId,
        name: file.name,
        type: "folder",
        parentId: newParentId,
        updatedAt: now,
      });
      idMap.set(file._id, newId);
    }

    // Pass 2: create files (text and binary)
    for (const file of sortedFiles) {
      if (file.type !== "file") continue;
      if (file.content == null && file.storageId == null) continue;
      const newParentId = file.parentId
        ? (idMap.get(file.parentId) as Id<"files"> | undefined)
        : undefined;
      await ctx.db.insert("files", {
        projectId: newProjectId,
        name: file.name,
        type: "file",
        parentId: newParentId,
        updatedAt: now,
        // Text file: copy content; binary file: share the immutable storageId blob
        ...(file.content != null
          ? { content: file.content }
          : { storageId: file.storageId! }),
      });
    }

    // Clone conversations and their messages
    const templateConversations = await ctx.db
      .query("conversations")
      .withIndex("by_project", (q) => q.eq("projectId", template._id))
      .collect();

    for (const convo of templateConversations) {
      const newConvoId = await ctx.db.insert("conversations", {
        projectId: newProjectId,
        title: convo.title,
        updatedAt: convo.updatedAt,
      });

      const templateMessages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", convo._id))
        .collect();

      for (const msg of templateMessages) {
        await ctx.db.insert("messages", {
          conversationId: newConvoId,
          projectId: newProjectId,
          role: msg.role,
          content: msg.content,
          ...(msg.status ? { status: msg.status } : {}),
        });
      }
    }

    return { projectId: newProjectId };
  },
});

// Internal mutation for continuing project deletion
export const continueDeleteProject = internalMutation({
  args: {
    projectId: v.id("projects"),
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) return;
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
      await ctx.db.delete(file._id);
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
      await ctx.db.delete(message._id);
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
      await ctx.db.delete(conversation._id);
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
    await ctx.db.delete(args.projectId);
  },
});
