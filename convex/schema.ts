import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  projects: defineTable({
    name: v.string(),
    ownerId: v.string(),
    updatedAt: v.number(),
    importStatus: v.optional(
      v.union(
        v.literal("importing"),
        v.literal("completed"),
        v.literal("failed"),
      ),
    ),
    exportStatus: v.optional(
      v.union(
        v.literal("exporting"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("cancelled"),
      ),
    ),
    exportRepoUrl: v.optional(v.string()),
    settings: v.optional(
      v.object({
        installCommand: v.optional(v.string()),
        devCommand: v.optional(v.string()),
      }),
    ),
  }).index("by_owner", ["ownerId"]),

  files: defineTable({
    projectId: v.id("projects"),
    parentId: v.optional(v.id("files")),
    name: v.string(),
    type: v.union(v.literal("file"), v.literal("folder")),
    content: v.optional(v.string()), // Text files only
    storageId: v.optional(v.id("_storage")), // Binary files only
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_parent", ["parentId"])
    .index("by_project_parent", ["projectId", "parentId"]),

  conversations: defineTable({
    projectId: v.id("projects"),
    title: v.string(),
    updatedAt: v.number(),
  }).index("by_project", ["projectId"]),

  extensions: defineTable({
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    longDescription: v.string(),
    author: v.string(),
    version: v.string(),
    icon: v.string(),
    category: v.union(
      v.literal("themes"),
      v.literal("languages"),
      v.literal("formatters"),
      v.literal("ai"),
      v.literal("productivity"),
      v.literal("snippets"),
    ),
    tags: v.array(v.string()),
    downloads: v.number(),
    rating: v.number(),
    extensionType: v.union(
      v.literal("codemirror-theme"),
      v.literal("codemirror-language"),
      v.literal("editor-feature"),
      v.literal("ui-feature"),
      v.literal("ai-integration"),
      v.literal("formatter"),
    ),
    configKey: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_category", ["category"]),

  installedExtensions: defineTable({
    projectId: v.id("projects"),
    extensionId: v.id("extensions"),
    enabled: v.boolean(),
    installedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_extension", ["projectId", "extensionId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    projectId: v.id("projects"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    status: v.optional(
      v.union(
        v.literal("processing"),
        v.literal("completed"),
        v.literal("cancelled"),
      ),
    ),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_project_status", ["projectId", "status"]),
});
