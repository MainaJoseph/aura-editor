import { v } from "convex/values";
import { nanoid } from "nanoid";

import { mutation, query } from "./_generated/server";
import { verifyAuth } from "./auth";
import { requireProjectAccess, getProjectRole as getProjectRoleHelper } from "./members";

export const createInviteLink = mutation({
  args: {
    projectId: v.id("projects"),
    role: v.union(v.literal("editor"), v.literal("viewer")),
    expiresAt: v.optional(v.number()),
    maxUses: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    await requireProjectAccess(ctx, args.projectId, identity.subject, "editor");

    const token = nanoid(24);
    const now = Date.now();

    const linkId = await ctx.db.insert("inviteLinks", {
      projectId: args.projectId,
      token,
      role: args.role,
      createdBy: identity.subject,
      createdAt: now,
      expiresAt: args.expiresAt,
      maxUses: args.maxUses,
      useCount: 0,
    });

    return { linkId, token };
  },
});

export const acceptInviteLink = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const link = await ctx.db
      .query("inviteLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!link) throw new Error("Invalid invite link");

    // Check expiration
    if (link.expiresAt && link.expiresAt < Date.now()) {
      throw new Error("This invite link has expired");
    }

    // Check max uses
    if (link.maxUses && link.useCount >= link.maxUses) {
      throw new Error("This invite link has reached its maximum uses");
    }

    const project = await ctx.db.get(link.projectId);
    if (!project) throw new Error("Project not found");

    // Don't add owner as member
    if (project.ownerId === identity.subject) {
      return { projectId: link.projectId, alreadyMember: true };
    }

    // Check if already a member
    const existingMember = await ctx.db
      .query("members")
      .withIndex("by_project_user", (q) =>
        q.eq("projectId", link.projectId).eq("userId", identity.subject),
      )
      .unique();

    if (existingMember) {
      return { projectId: link.projectId, alreadyMember: true };
    }

    // Add member
    const userName = identity.name ?? identity.nickname ?? "Anonymous";
    await ctx.db.insert("members", {
      projectId: link.projectId,
      userId: identity.subject,
      userName,
      role: link.role,
      invitedBy: link.createdBy,
      joinedAt: Date.now(),
    });

    // Increment use count
    await ctx.db.patch(link._id, {
      useCount: link.useCount + 1,
    });

    return { projectId: link.projectId, alreadyMember: false };
  },
});

export const revokeInviteLink = mutation({
  args: {
    linkId: v.id("inviteLinks"),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const link = await ctx.db.get(args.linkId);
    if (!link) throw new Error("Invite link not found");

    await requireProjectAccess(ctx, link.projectId, identity.subject, "owner");

    await ctx.db.delete(args.linkId);
  },
});

export const sendEmailInvite = mutation({
  args: {
    projectId: v.id("projects"),
    email: v.string(),
    role: v.union(v.literal("editor"), v.literal("viewer")),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    await requireProjectAccess(ctx, args.projectId, identity.subject, "editor");

    const normalizedEmail = args.email.toLowerCase();

    // Check if a pending invite already exists — use by_email index instead of loading all project invites
    const existingInvites = await ctx.db
      .query("emailInvites")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .collect();

    const existing = existingInvites.find(
      (inv) => inv.projectId === args.projectId && inv.status === "pending",
    );

    let inviteId;
    if (existing) {
      // Update the existing invite (allows resending)
      await ctx.db.patch(existing._id, {
        role: args.role,
        invitedBy: identity.subject,
        createdAt: Date.now(),
      });
      inviteId = existing._id;
    } else {
      inviteId = await ctx.db.insert("emailInvites", {
        projectId: args.projectId,
        email: normalizedEmail,
        role: args.role,
        invitedBy: identity.subject,
        createdAt: Date.now(),
        status: "pending",
      });
    }

    return inviteId;
  },
});

export const acceptEmailInvite = mutation({
  args: {
    inviteId: v.id("emailInvites"),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const invite = await ctx.db.get(args.inviteId);
    if (!invite) throw new Error("Invite not found");

    if (invite.status !== "pending") {
      throw new Error("This invite is no longer pending");
    }

    // Verify the caller's email matches the invite recipient
    const callerEmail =
      identity.email ?? (identity.emailAddresses as Array<{ emailAddress: string }> | undefined)?.[0]?.emailAddress;
    if (
      !callerEmail ||
      callerEmail.toLowerCase() !== invite.email.toLowerCase()
    ) {
      throw new Error("This invite was sent to a different email address");
    }

    const project = await ctx.db.get(invite.projectId);
    if (!project) throw new Error("Project not found");

    // Check if already a member or owner
    if (project.ownerId === identity.subject) {
      await ctx.db.patch(args.inviteId, { status: "accepted" });
      return { projectId: invite.projectId };
    }

    const existingMember = await ctx.db
      .query("members")
      .withIndex("by_project_user", (q) =>
        q.eq("projectId", invite.projectId).eq("userId", identity.subject),
      )
      .unique();

    if (!existingMember) {
      const userName = identity.name ?? identity.nickname ?? "Anonymous";
      await ctx.db.insert("members", {
        projectId: invite.projectId,
        userId: identity.subject,
        userName,
        role: invite.role,
        invitedBy: invite.invitedBy,
        joinedAt: Date.now(),
      });
    }

    await ctx.db.patch(args.inviteId, { status: "accepted" });

    return { projectId: invite.projectId };
  },
});

export const declineEmailInvite = mutation({
  args: {
    inviteId: v.id("emailInvites"),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const invite = await ctx.db.get(args.inviteId);
    if (!invite) throw new Error("Invite not found");

    if (invite.status !== "pending") {
      throw new Error("This invite is no longer pending");
    }

    // Verify the caller is the intended recipient
    const callerEmail =
      identity.email ?? (identity.emailAddresses as Array<{ emailAddress: string }> | undefined)?.[0]?.emailAddress;
    if (
      !callerEmail ||
      callerEmail.toLowerCase() !== invite.email.toLowerCase()
    ) {
      throw new Error("This invite was sent to a different email address");
    }

    await ctx.db.patch(args.inviteId, { status: "declined" });
  },
});

export const removeMember = mutation({
  args: {
    memberId: v.id("members"),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const member = await ctx.db.get(args.memberId);
    if (!member) throw new Error("Member not found");

    await requireProjectAccess(ctx, member.projectId, identity.subject, "owner");

    await ctx.db.delete(args.memberId);
  },
});

export const updateMemberRole = mutation({
  args: {
    memberId: v.id("members"),
    role: v.union(v.literal("editor"), v.literal("viewer")),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const member = await ctx.db.get(args.memberId);
    if (!member) throw new Error("Member not found");

    await requireProjectAccess(ctx, member.projectId, identity.subject, "owner");

    await ctx.db.patch(args.memberId, { role: args.role });
  },
});

// Queries

export const getInviteLinks = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    try {
      await requireProjectAccess(ctx, args.projectId, identity.subject, "editor");
    } catch {
      return [];
    }

    return await ctx.db
      .query("inviteLinks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const getMembers = query({
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

    return await ctx.db
      .query("members")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const getPendingInvitesForUser = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    // Only allow users to query their own pending invites
    const callerEmail =
      identity.email ?? (identity.emailAddresses as Array<{ emailAddress: string }> | undefined)?.[0]?.emailAddress;
    const normalizedEmail = args.email.toLowerCase();
    if (
      !callerEmail ||
      callerEmail.toLowerCase() !== normalizedEmail
    ) {
      return [];
    }

    const invites = await ctx.db
      .query("emailInvites")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .collect();

    // Only return pending invites
    const pendingInvites = invites.filter((inv) => inv.status === "pending");

    // Enrich with project names
    const enriched = await Promise.all(
      pendingInvites.map(async (invite) => {
        const project = await ctx.db.get(invite.projectId);
        return {
          ...invite,
          projectName: project?.name ?? "Unknown Project",
        };
      }),
    );

    return enriched;
  },
});

export const getInviteLinkByToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("inviteLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!link) return null;

    const project = await ctx.db.get(link.projectId);
    if (!project) return null;

    return {
      projectName: project.name,
      role: link.role,
      expired: link.expiresAt ? link.expiresAt < Date.now() : false,
      maxUsesReached: link.maxUses ? link.useCount >= link.maxUses : false,
    };
  },
});

export const getEmailInvites = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    try {
      await requireProjectAccess(ctx, args.projectId, identity.subject, "editor");
    } catch {
      return [];
    }

    return await ctx.db
      .query("emailInvites")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const cancelEmailInvite = mutation({
  args: {
    inviteId: v.id("emailInvites"),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const invite = await ctx.db.get(args.inviteId);
    if (!invite) throw new Error("Invite not found");

    await requireProjectAccess(ctx, invite.projectId, identity.subject, "editor");

    await ctx.db.delete(args.inviteId);
  },
});

export const getProjectRole = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    return await getProjectRoleHelper(ctx, args.projectId, identity.subject);
  },
});
