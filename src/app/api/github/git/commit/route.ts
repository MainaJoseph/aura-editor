import { z } from "zod";
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

import { inngest } from "@/inngest/client";
import { convex } from "@/lib/convex-client";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";

const requestSchema = z.object({
  projectId: z.string(),
  message: z.string().min(1),
  stagedPaths: z.array(z.string()).min(1),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let projectId: string, message: string, stagedPaths: string[];
  try {
    ({ projectId, message, stagedPaths } = requestSchema.parse(body));
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const internalKey = process.env.AURA_CONVEX_INTERNAL_KEY;
  if (!internalKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const project = await convex.query(api.system.getProjectById, {
    internalKey,
    projectId: projectId as Id<"projects">,
  });

  if (!project || project.ownerId !== userId) {
    return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 403 });
  }

  if (!project.gitRepo || !project.gitBranch || !project.gitLastCommitSha) {
    return NextResponse.json({ error: "Project not connected to a git repository" }, { status: 400 });
  }

  // Validate repo format
  const repoParts = project.gitRepo.split("/");
  if (repoParts.length !== 2 || !repoParts[0] || !repoParts[1]) {
    return NextResponse.json({ error: "Invalid repository format" }, { status: 400 });
  }

  // Validate GitHub token before dispatching to give immediate feedback
  const client = await clerkClient();
  const tokens = await client.users.getUserOauthAccessToken(userId, "github");
  if (!tokens.data[0]?.token) {
    return NextResponse.json(
      { error: "GitHub not connected. Please reconnect your GitHub account." },
      { status: 400 },
    );
  }

  // Dispatch to Inngest — the gitCommit function handles the full commit flow
  // with step-based retries and onFailure status cleanup, avoiding serverless timeouts.
  const event = await inngest.send({
    name: "github/git.commit",
    data: { projectId, message, stagedPaths, userId },
  });

  return NextResponse.json({ success: true, eventId: event.ids[0] });
}
