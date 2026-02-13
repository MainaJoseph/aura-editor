import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export type ProjectRole = "owner" | "editor" | "viewer";

const ROLE_LEVELS: Record<ProjectRole, number> = {
  viewer: 0,
  editor: 1,
  owner: 2,
};

export async function getProjectRole(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"projects">,
  userId: string,
): Promise<ProjectRole | null> {
  const project = await ctx.db.get(projectId);
  if (!project) return null;

  // Fast path: project owner
  if (project.ownerId === userId) return "owner";

  // Check members table
  const member = await ctx.db
    .query("members")
    .withIndex("by_project_user", (q) =>
      q.eq("projectId", projectId).eq("userId", userId),
    )
    .unique();

  return member?.role ?? null;
}

export async function requireProjectAccess(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"projects">,
  userId: string,
  minimumRole: ProjectRole,
): Promise<ProjectRole> {
  const role = await getProjectRole(ctx, projectId, userId);

  if (!role) {
    throw new Error("You do not have access to this project");
  }

  if (ROLE_LEVELS[role] < ROLE_LEVELS[minimumRole]) {
    throw new Error(
      `Requires ${minimumRole} access, but you have ${role} access`,
    );
  }

  return role;
}
