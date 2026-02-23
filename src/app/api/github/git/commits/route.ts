import { Octokit } from "octokit";
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

import { convex } from "@/lib/convex-client";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";

export interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  date: string;
  parents: string[];
}

export interface BranchRef {
  name: string;
  sha: string;
  isCurrent: boolean;
}

export interface GitCommitsResponse {
  commits: CommitInfo[];
  branches: BranchRef[];
  currentSha: string | null;
}

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const parsedLimit = parseInt(searchParams.get("limit") ?? "60", 10);
  const limit = Number.isNaN(parsedLimit) || parsedLimit < 1 ? 60 : Math.min(parsedLimit, 100);

  if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });

  const internalKey = process.env.AURA_CONVEX_INTERNAL_KEY;
  if (!internalKey) return NextResponse.json({ error: "Server configuration error" }, { status: 500 });

  const project = await convex.query(api.system.getProjectById, {
    internalKey,
    projectId: projectId as Id<"projects">,
  });

  if (!project || project.ownerId !== userId) {
    return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 403 });
  }

  if (!project.gitRepo || !project.gitBranch) {
    return NextResponse.json({ error: "Project not connected to a git repository" }, { status: 400 });
  }

  const client = await clerkClient();
  const tokens = await client.users.getUserOauthAccessToken(userId, "github");
  const githubToken = tokens.data[0]?.token;

  if (!githubToken) {
    return NextResponse.json({ error: "GitHub not connected." }, { status: 400 });
  }

  const repoParts = project.gitRepo.split("/");
  if (repoParts.length !== 2 || !repoParts[0] || !repoParts[1]) {
    return NextResponse.json({ error: "Invalid git repository format" }, { status: 400 });
  }
  const [owner, repo] = repoParts;
  const octokit = new Octokit({ auth: githubToken });

  // Fetch branches (to mark branch heads on commits)
  let branches: BranchRef[] = [];
  try {
    const { data } = await octokit.rest.repos.listBranches({ owner, repo, per_page: 50 });
    branches = data.map((b) => ({
      name: b.name,
      sha: b.commit.sha,
      isCurrent: b.name === project.gitBranch,
    }));
  } catch {
    // non-fatal
  }

  // Fetch commits for the current branch
  try {
    const { data: rawCommits } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      sha: project.gitBranch,
      per_page: limit,
    });

    const commits: CommitInfo[] = rawCommits.map((c) => ({
      sha: c.sha,
      message: (c.commit.message.split("\n")[0] ?? c.commit.message).trim(),
      author: c.commit.author?.name ?? c.commit.committer?.name ?? "Unknown",
      date: c.commit.author?.date ?? c.commit.committer?.date ?? "",
      parents: c.parents.map((p) => p.sha),
    }));

    // Cache in Convex so future opens are instant (no API call needed)
    try {
      await convex.mutation(api.system.updateGitStateInternal, {
        internalKey,
        projectId: projectId as Id<"projects">,
        gitCommitHistory: JSON.stringify(commits),
      });
    } catch {
      // non-fatal
    }

    const response: GitCommitsResponse = {
      commits,
      branches,
      currentSha: project.gitLastCommitSha ?? null,
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json({ error: "Failed to fetch commits" }, { status: 500 });
  }
}
