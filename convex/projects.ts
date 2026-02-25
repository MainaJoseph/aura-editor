import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";

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
      isPublic: false,
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

    // Any authenticated user can view a public project
    if (project.isPublic) return project;

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

// Upper bounds for demo template — prevents hitting Convex's 8,192 doc read limit
const DEMO_MAX_FILES = 500;
const DEMO_MAX_CONVERSATIONS = 20;
const DEMO_MAX_MESSAGES = 200;

export const cloneDemoProject = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await verifyAuth(ctx);
    const userId = identity.subject;

    // Idempotency guard: use filter+first instead of collecting all owned projects
    const existingDemo = await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .filter((q) => q.eq(q.field("isDemo"), true))
      .first();

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

    // Fetch template files within safe bounds
    const templateFiles = await ctx.db
      .query("files")
      .withIndex("by_project", (q) => q.eq("projectId", template._id))
      .take(DEMO_MAX_FILES);

    // Calculate depth for each file (root = 0)
    const getDepth = (
      fileId: string,
      filesById: Map<string, (typeof templateFiles)[0]>,
      cache: Map<string, number>,
      visiting = new Set<string>(),
    ): number => {
      if (cache.has(fileId)) return cache.get(fileId)!;
      if (visiting.has(fileId)) return 0; // cycle detected, treat as root
      const file = filesById.get(fileId);
      if (!file || !file.parentId) {
        cache.set(fileId, 0);
        return 0;
      }
      visiting.add(fileId);
      const depth = 1 + getDepth(file.parentId, filesById, cache, visiting);
      visiting.delete(fileId);
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

    // Clone conversations and their messages within safe bounds
    const templateConversations = await ctx.db
      .query("conversations")
      .withIndex("by_project", (q) => q.eq("projectId", template._id))
      .take(DEMO_MAX_CONVERSATIONS);

    for (const convo of templateConversations) {
      const newConvoId = await ctx.db.insert("conversations", {
        projectId: newProjectId,
        title: convo.title,
        updatedAt: convo.updatedAt,
      });

      const templateMessages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", convo._id))
        .take(DEMO_MAX_MESSAGES);

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

const FORK_MAX_FILES = 500;

export const forkProject = mutation({
  args: { sourceProjectId: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);
    const userId = identity.subject;

    const source = await ctx.db.get(args.sourceProjectId);
    if (!source) throw new Error("Project not found");
    if (!source.isPublic && source.ownerId !== userId)
      throw new Error("Not accessible");

    // Idempotency: return existing fork if user already has one
    const existingFork = await ctx.db
      .query("projects")
      .withIndex("by_forked_from", (q) =>
        q.eq("forkedFromId", args.sourceProjectId),
      )
      .filter((q) => q.eq(q.field("ownerId"), userId))
      .first();

    if (existingFork) {
      return { projectId: existingFork._id, alreadyForked: true as const };
    }

    const now = Date.now();
    const newProjectId = await ctx.db.insert("projects", {
      name: `${source.name} (Fork)`,
      ownerId: userId,
      updatedAt: now,
      isPublic: false,
      isForked: true,
      forkedFromId: args.sourceProjectId,
      ...(source.settings ? { settings: source.settings } : {}),
    });

    const allFiles = await ctx.db
      .query("files")
      .withIndex("by_project", (q) => q.eq("projectId", args.sourceProjectId))
      .collect();

    const limited = allFiles.slice(0, FORK_MAX_FILES);
    const idMap = new Map<string, Id<"files">>();

    // Pass 1: folders (no-parent first, approximates depth order)
    const folders = limited
      .filter((f) => f.type === "folder")
      .sort((a, b) => (!a.parentId ? -1 : !b.parentId ? 1 : 0));

    for (const folder of folders) {
      const newParentId = folder.parentId
        ? idMap.get(folder.parentId)
        : undefined;
      const newId = await ctx.db.insert("files", {
        projectId: newProjectId,
        name: folder.name,
        type: "folder",
        parentId: newParentId,
        updatedAt: now,
      });
      idMap.set(folder._id, newId);
    }

    // Pass 2: files
    for (const file of limited.filter((f) => f.type === "file")) {
      const newParentId = file.parentId
        ? idMap.get(file.parentId)
        : undefined;
      await ctx.db.insert("files", {
        projectId: newProjectId,
        name: file.name,
        type: "file",
        parentId: newParentId,
        updatedAt: now,
        ...(file.content !== undefined ? { content: file.content } : {}),
        ...(file.storageId ? { storageId: file.storageId } : {}),
      });
    }

    return { projectId: newProjectId, alreadyForked: false as const };
  },
});

export const getMyForkOf = query({
  args: { sourceProjectId: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);
    const fork = await ctx.db
      .query("projects")
      .withIndex("by_forked_from", (q) =>
        q.eq("forkedFromId", args.sourceProjectId),
      )
      .filter((q) => q.eq(q.field("ownerId"), identity.subject))
      .first();
    return fork ? fork._id : null;
  },
});

export const getForkCount = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const forks = await ctx.db
      .query("projects")
      .withIndex("by_forked_from", (q) =>
        q.eq("forkedFromId", args.projectId),
      )
      .collect();
    return forks.length;
  },
});

export const setVisibility = mutation({
  args: {
    id: v.id("projects"),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const project = await ctx.db.get(args.id);
    if (!project) throw new Error("Project not found");

    if (project.ownerId !== identity.subject) {
      throw new Error("Only the project owner can change visibility");
    }

    if (project.isDemo === true || project.isDemoTemplate === true) {
      throw new Error("Demo projects cannot be made public");
    }

    await ctx.db.patch(args.id, {
      isPublic: args.isPublic,
      updatedAt: Date.now(),
    });
  },
});

export const getPublicProjectsPaginated = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("projects")
      .withIndex("by_public", (q) => q.eq("isPublic", true))
      .order("desc")
      .paginate(args.paginationOpts);

    const items = await Promise.all(
      page.page.map(async (project) => {
        const bannerUrl = project.bannerStorageId
          ? await ctx.storage.getUrl(project.bannerStorageId)
          : null;
        const forks = await ctx.db
          .query("projects")
          .withIndex("by_forked_from", (q) => q.eq("forkedFromId", project._id))
          .collect();
        return {
          _id: project._id,
          _creationTime: project._creationTime,
          name: project.name,
          updatedAt: project.updatedAt,
          ownerId: project.ownerId,
          isForked: project.isForked ?? false,
          bannerUrl,
          forkCount: forks.length,
        };
      }),
    );

    return { ...page, page: items };
  },
});

export const searchPublicProjects = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("projects")
      .withSearchIndex("search_name", (q) =>
        q.search("name", args.query).eq("isPublic", true),
      )
      .take(50);

    return await Promise.all(
      results.map(async (project) => {
        const bannerUrl = project.bannerStorageId
          ? await ctx.storage.getUrl(project.bannerStorageId)
          : null;
        const forks = await ctx.db
          .query("projects")
          .withIndex("by_forked_from", (q) => q.eq("forkedFromId", project._id))
          .collect();
        return {
          _id: project._id,
          _creationTime: project._creationTime,
          name: project.name,
          updatedAt: project.updatedAt,
          ownerId: project.ownerId,
          isForked: project.isForked ?? false,
          bannerUrl,
          forkCount: forks.length,
        };
      }),
    );
  },
});

export const generateBannerUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await verifyAuth(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const updateProjectBanner = mutation({
  args: {
    projectId: v.id("projects"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    if (project.ownerId !== identity.subject) throw new Error("Not authorized");

    if (project.bannerStorageId) {
      await ctx.storage.delete(project.bannerStorageId);
    }

    await ctx.db.patch(args.projectId, {
      bannerStorageId: args.storageId,
      updatedAt: Date.now(),
    });
  },
});

export const getPublicProjects = query({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_public", (q) => q.eq("isPublic", true))
      .order("desc")
      .collect();

    return projects.map((p) => ({
      _id: p._id,
      _creationTime: p._creationTime,
      name: p.name,
      updatedAt: p.updatedAt,
      ownerId: p.ownerId,
    }));
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
