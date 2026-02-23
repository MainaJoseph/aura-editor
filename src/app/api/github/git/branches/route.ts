import { z } from "zod";
import { Octokit } from "octokit";
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

import { convex } from "@/lib/convex-client";

import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";

export async function GET(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
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

  if (!project.gitRepo) {
    return NextResponse.json({ error: "Project not connected to a git repository" }, { status: 400 });
  }

  const client = await clerkClient();
  const tokens = await client.users.getUserOauthAccessToken(userId, "github");
  const githubToken = tokens.data[0]?.token;

  if (!githubToken) {
    return NextResponse.json(
      { error: "GitHub not connected. Please reconnect your GitHub account." },
      { status: 400 },
    );
  }

  const [owner, repo] = project.gitRepo.split("/");
  const octokit = new Octokit({ auth: githubToken });

  try {
    const { data: branches } = await octokit.rest.repos.listBranches({
      owner,
      repo,
      per_page: 100,
    });

    return NextResponse.json({
      branches: branches.map((b) => b.name),
      currentBranch: project.gitBranch ?? branches[0]?.name ?? "main",
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch branches" }, { status: 500 });
  }
}

const createBranchSchema = z.object({
  projectId: z.string(),
  branchName: z.string().min(1),
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

  let projectId: string, branchName: string;
  try {
    ({ projectId, branchName } = createBranchSchema.parse(body));
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

  if (!project.gitRepo || !project.gitLastCommitSha) {
    return NextResponse.json({ error: "Project not connected to a git repository" }, { status: 400 });
  }

  const client = await clerkClient();
  const tokens = await client.users.getUserOauthAccessToken(userId, "github");
  const githubToken = tokens.data[0]?.token;

  if (!githubToken) {
    return NextResponse.json(
      { error: "GitHub not connected. Please reconnect your GitHub account." },
      { status: 400 },
    );
  }

  const [owner, repo] = project.gitRepo.split("/");
  const octokit = new Octokit({ auth: githubToken });

  try {
    await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: project.gitLastCommitSha,
    });

    return NextResponse.json({ success: true, branchName });
  } catch {
    return NextResponse.json({ error: "Failed to create branch" }, { status: 500 });
  }
}
