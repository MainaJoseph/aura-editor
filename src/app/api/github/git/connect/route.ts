import { z } from "zod";
import { Octokit } from "octokit";
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

import { convex } from "@/lib/convex-client";
import { inngest } from "@/inngest/client";

import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";

const requestSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("create"),
    projectId: z.string(),
    repoName: z.string().min(1).max(100),
    visibility: z.enum(["public", "private"]).default("private"),
    description: z.string().max(350).optional(),
  }),
  z.object({
    mode: z.literal("link"),
    projectId: z.string(),
    repoUrl: z.string().url(),
  }),
]);

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

  let parsed;
  try {
    parsed = requestSchema.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const internalKey = process.env.AURA_CONVEX_INTERNAL_KEY;
  if (!internalKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const project = await convex.query(api.system.getProjectById, {
    internalKey,
    projectId: parsed.projectId as Id<"projects">,
  });

  if (!project || project.ownerId !== userId) {
    return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 403 });
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

  if (parsed.mode === "create") {
    // Set connecting status
    await convex.mutation(api.system.updateGitStateInternal, {
      internalKey,
      projectId: parsed.projectId as Id<"projects">,
      gitSyncStatus: "connecting",
    });

    try {
      const event = await inngest.send({
        name: "github/git.connect",
        data: {
          projectId: parsed.projectId,
          repoName: parsed.repoName,
          visibility: parsed.visibility,
          description: parsed.description,
          userId,
        },
      });
      return NextResponse.json({ success: true, eventId: event.ids[0] });
    } catch (err) {
      // Clear stuck "connecting" status if event dispatch fails
      await convex.mutation(api.system.updateGitStateInternal, {
        internalKey,
        projectId: parsed.projectId as Id<"projects">,
        clearGitSyncStatus: true,
      }).catch(() => {});
      const message = err instanceof Error ? err.message : "Failed to start connection";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } else {
    // Link mode: parse repoUrl to get owner/repo
    let owner: string, repo: string;
    try {
      const url = new URL(parsed.repoUrl);
      const parts = url.pathname.replace(/^\//, "").replace(/\.git$/, "").split("/");
      if (parts.length < 2 || !parts[0] || !parts[1]) throw new Error("Invalid repo URL");
      [owner, repo] = parts;
    } catch {
      return NextResponse.json({ error: "Invalid GitHub repository URL" }, { status: 400 });
    }

    const octokit = new Octokit({ auth: githubToken });

    let repoData;
    try {
      const { data } = await octokit.rest.repos.get({ owner, repo });
      repoData = data;
    } catch {
      return NextResponse.json({ error: "Repository not found or inaccessible" }, { status: 400 });
    }

    // Get HEAD SHA for the default branch
    let headSha: string;
    try {
      const { data: ref } = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${repoData.default_branch}`,
      });
      headSha = ref.object.sha;
    } catch {
      return NextResponse.json({ error: "Could not fetch branch HEAD" }, { status: 400 });
    }

    // Fetch commit history for the linked repo
    let gitCommitHistory: string | undefined;
    try {
      const { data: rawCommits } = await octokit.rest.repos.listCommits({
        owner,
        repo,
        sha: repoData.default_branch,
        per_page: 60,
      });
      gitCommitHistory = JSON.stringify(
        rawCommits.map((c) => ({
          sha: c.sha,
          message: (c.commit.message.split("\n")[0] ?? "").trim(),
          author: c.commit.author?.name ?? c.commit.committer?.name ?? "Unknown",
          date: c.commit.author?.date ?? c.commit.committer?.date ?? "",
          parents: c.parents.map((p: { sha: string }) => p.sha),
        })),
      );
    } catch {
      // non-fatal
    }

    await convex.mutation(api.system.updateGitStateInternal, {
      internalKey,
      projectId: parsed.projectId as Id<"projects">,
      gitRepo: `${owner}/${repo}`,
      gitBranch: repoData.default_branch,
      gitLastCommitSha: headSha,
      ...(gitCommitHistory ? { gitCommitHistory } : {}),
      clearGitSyncStatus: true,
    });

    return NextResponse.json({
      success: true,
      gitRepo: `${owner}/${repo}`,
      gitBranch: repoData.default_branch,
      gitLastCommitSha: headSha,
    });
  }
}
