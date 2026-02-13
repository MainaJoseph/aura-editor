import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { verifyAuth } from "./auth";
import { requireProjectAccess } from "./members";
import { Doc, Id } from "./_generated/dataModel";

export const getFiles = query({
  args: { projectId: v.id("projects") },
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
      .query("files")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const getFile = query({
  args: { id: v.id("files") },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const file = await ctx.db.get(args.id);
    if (!file) return null;

    const project = await ctx.db.get(file.projectId);
    if (!project) return null;

    try {
      await requireProjectAccess(ctx, file.projectId, identity.subject, "viewer");
    } catch {
      return null;
    }

    return file;
  },
});

export const getFilePath = query({
  args: { id: v.id("files") },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const file = await ctx.db.get(args.id);
    if (!file) return [];

    const project = await ctx.db.get(file.projectId);
    if (!project) return [];

    try {
      await requireProjectAccess(ctx, file.projectId, identity.subject, "viewer");
    } catch {
      return [];
    }

    const path: { _id: string; name: string }[] = [];
    let currentId: Id<"files"> | undefined = args.id;

    while (currentId) {
      const file = (await ctx.db.get(currentId)) as Doc<"files"> | undefined;
      if (!file) break;

      path.unshift({ _id: file._id, name: file.name });
      currentId = file.parentId;
    }

    return path;
  },
});

export const getFolderContents = query({
  args: {
    projectId: v.id("projects"),
    parentId: v.optional(v.id("files")),
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

    const files = await ctx.db
      .query("files")
      .withIndex("by_project_parent", (q) =>
        q.eq("projectId", args.projectId).eq("parentId", args.parentId)
      )
      .collect();

    return files.sort((a, b) => {
      if (a.type === "folder" && b.type === "file") return -1;
      if (a.type === "file" && b.type === "folder") return 1;
      return a.name.localeCompare(b.name);
    });
  },
});

export const createFile = mutation({
  args: {
    projectId: v.id("projects"),
    parentId: v.optional(v.id("files")),
    name: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    await requireProjectAccess(ctx, args.projectId, identity.subject, "editor");

    const files = await ctx.db
      .query("files")
      .withIndex("by_project_parent", (q) =>
        q.eq("projectId", args.projectId).eq("parentId", args.parentId)
      )
      .collect();

    const existing = files.find(
      (file) => file.name === args.name && file.type === "file"
    );

    if (existing) throw new Error("File already exists");

    const now = Date.now();

    await ctx.db.insert("files", {
      projectId: args.projectId,
      name: args.name,
      content: args.content,
      type: "file",
      parentId: args.parentId,
      updatedAt: now,
    });

    await ctx.db.patch(args.projectId, {
      updatedAt: now,
    });
  },
});

export const createFolder = mutation({
  args: {
    projectId: v.id("projects"),
    parentId: v.optional(v.id("files")),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    await requireProjectAccess(ctx, args.projectId, identity.subject, "editor");

    const files = await ctx.db
      .query("files")
      .withIndex("by_project_parent", (q) =>
        q.eq("projectId", args.projectId).eq("parentId", args.parentId)
      )
      .collect();

    const existing = files.find(
      (file) => file.name === args.name && file.type === "folder"
    );

    if (existing) throw new Error("Folder already exists");

    const now = Date.now();

    await ctx.db.insert("files", {
      projectId: args.projectId,
      name: args.name,
      type: "folder",
      parentId: args.parentId,
      updatedAt: now,
    });

    await ctx.db.patch(args.projectId, {
      updatedAt: now,
    });
  },
});

export const renameFile = mutation({
  args: {
    id: v.id("files"),
    newName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const file = await ctx.db.get(args.id);
    if (!file) throw new Error("File not found");

    const project = await ctx.db.get(file.projectId);
    if (!project) throw new Error("Project not found");

    await requireProjectAccess(ctx, file.projectId, identity.subject, "editor");

    const siblings = await ctx.db
      .query("files")
      .withIndex("by_project_parent", (q) =>
        q.eq("projectId", file.projectId).eq("parentId", file.parentId)
      )
      .collect();

    const existing = siblings.find(
      (sibling) =>
        sibling.name === args.newName &&
        sibling.type === file.type &&
        sibling._id !== args.id
    );

    if (existing) {
      throw new Error(
        `A ${file.type} with this name already exists in this location`
      );
    }

    const now = Date.now();

    await ctx.db.patch(args.id, {
      name: args.newName,
      updatedAt: now,
    });

    await ctx.db.patch(file.projectId, {
      updatedAt: now,
    });
  },
});

export const deleteFile = mutation({
  args: {
    id: v.id("files"),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const file = await ctx.db.get(args.id);
    if (!file) throw new Error("File not found");

    const project = await ctx.db.get(file.projectId);
    if (!project) throw new Error("Project not found");

    await requireProjectAccess(ctx, file.projectId, identity.subject, "editor");

    const deleteRecursive = async (fileId: Id<"files">) => {
      const item = await ctx.db.get(fileId);
      if (!item) return;

      if (item.type === "folder") {
        const children = await ctx.db
          .query("files")
          .withIndex("by_project_parent", (q) =>
            q.eq("projectId", item.projectId).eq("parentId", fileId)
          )
          .collect();

        for (const child of children) {
          await deleteRecursive(child._id);
        }
      }

      if (item.storageId) {
        await ctx.storage.delete(item.storageId);
      }

      await ctx.db.delete(fileId);
    };

    await deleteRecursive(args.id);

    await ctx.db.patch(file.projectId, {
      updatedAt: Date.now(),
    });
  },
});

export const updateFile = mutation({
  args: {
    id: v.id("files"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const file = await ctx.db.get(args.id);
    if (!file) throw new Error("File not found");

    const project = await ctx.db.get(file.projectId);
    if (!project) throw new Error("Project not found");

    await requireProjectAccess(ctx, file.projectId, identity.subject, "editor");

    const now = Date.now();

    await ctx.db.patch(args.id, {
      content: args.content,
      updatedAt: now,
    });

    await ctx.db.patch(file.projectId, {
      updatedAt: now,
    });
  },
});

export const syncFileFromContainer = mutation({
  args: {
    projectId: v.id("projects"),
    path: v.string(),
    content: v.string(),
    type: v.union(v.literal("file"), v.literal("folder")),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    await requireProjectAccess(ctx, args.projectId, identity.subject, "editor");

    const now = Date.now();

    const parts = args.path.split("/").filter(Boolean);
    if (parts.length === 0) return;

    let parentId: Id<"files"> | undefined = undefined;

    const deleteRecursive = async (fileId: Id<"files">) => {
      const item = await ctx.db.get(fileId);
      if (!item) return;

      if (item.type === "folder") {
        const children = await ctx.db
          .query("files")
          .withIndex("by_project_parent", (q) =>
            q.eq("projectId", item.projectId).eq("parentId", fileId),
          )
          .collect();

        for (const child of children) {
          await deleteRecursive(child._id);
        }
      }

      if (item.storageId) {
        await ctx.storage.delete(item.storageId);
      }

      await ctx.db.delete(fileId);
    };

    for (let i = 0; i < parts.length - 1; i++) {
      const folderName = parts[i];

      const existingFiles = await ctx.db
        .query("files")
        .withIndex("by_project_parent", (q) =>
          q.eq("projectId", args.projectId).eq("parentId", parentId),
        )
        .collect();

      const existingFolder = existingFiles.find(
        (f) => f.name === folderName && f.type === "folder",
      );

      if (existingFolder) {
        parentId = existingFolder._id;
      } else {
        const conflictingFile = existingFiles.find(
          (f) => f.name === folderName && f.type === "file",
        );

        if (conflictingFile) {
          await ctx.db.delete(conflictingFile._id);
        }

        parentId = await ctx.db.insert("files", {
          projectId: args.projectId,
          name: folderName,
          type: "folder",
          parentId,
          updatedAt: now,
        });
      }
    }

    const fileName = parts[parts.length - 1];

    const siblings = await ctx.db
      .query("files")
      .withIndex("by_project_parent", (q) =>
        q.eq("projectId", args.projectId).eq("parentId", parentId),
      )
      .collect();

    const existingSameType = siblings.find(
      (f) => f.name === fileName && f.type === args.type,
    );

    const existingDifferentType = siblings.find(
      (f) => f.name === fileName && f.type !== args.type,
    );

    if (existingDifferentType) {
      await deleteRecursive(existingDifferentType._id);
    }

    if (existingSameType) {
      if (args.type === "file") {
        await ctx.db.patch(existingSameType._id, {
          content: args.content,
          updatedAt: now,
        });
      }
    } else {
      await ctx.db.insert("files", {
        projectId: args.projectId,
        name: fileName,
        type: args.type,
        content: args.type === "file" ? args.content : undefined,
        parentId,
        updatedAt: now,
      });
    }

    await ctx.db.patch(args.projectId, {
      updatedAt: now,
    });
  },
});

export const deleteFileByPath = mutation({
  args: {
    projectId: v.id("projects"),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    await requireProjectAccess(ctx, args.projectId, identity.subject, "editor");

    const parts = args.path.split("/").filter(Boolean);
    if (parts.length === 0) return;

    let parentId: Id<"files"> | undefined = undefined;
    let targetFile: Doc<"files"> | null = null;

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isLast = i === parts.length - 1;

      const files = await ctx.db
        .query("files")
        .withIndex("by_project_parent", (q) =>
          q.eq("projectId", args.projectId).eq("parentId", parentId),
        )
        .collect();

      if (isLast) {
        const file = files.find((f) => f.name === name);
        if (!file) return;
        targetFile = file;
      } else {
        const folder = files.find((f) => f.name === name && f.type === "folder");
        if (!folder) return;
        parentId = folder._id;
      }
    }

    if (!targetFile) return;

    const deleteRecursive = async (fileId: Id<"files">) => {
      const item = await ctx.db.get(fileId);
      if (!item) return;

      if (item.type === "folder") {
        const children = await ctx.db
          .query("files")
          .withIndex("by_project_parent", (q) =>
            q.eq("projectId", item.projectId).eq("parentId", fileId),
          )
          .collect();

        for (const child of children) {
          await deleteRecursive(child._id);
        }
      }

      if (item.storageId) {
        await ctx.storage.delete(item.storageId);
      }

      await ctx.db.delete(fileId);
    };

    await deleteRecursive(targetFile._id);

    await ctx.db.patch(args.projectId, {
      updatedAt: Date.now(),
    });
  },
});
