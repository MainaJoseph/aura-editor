import ky from "ky";
import { z } from "zod";
import { Octokit } from "octokit";
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

import { convex } from "@/lib/convex-client";
import { api } from "../../../../../../convex/_generated/api";
import { Doc, Id } from "../../../../../../convex/_generated/dataModel";

type FileWithUrl = Doc<"files"> & { storageUrl: string | null };

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

  // Get GitHub OAuth token
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
    // Set committing status
    await convex.mutation(api.system.updateGitStateInternal, {
      internalKey,
      projectId: projectId as Id<"projects">,
      gitSyncStatus: "committing",
    });

    // Get parent commit tree SHA
    const { data: parentCommit } = await octokit.rest.git.getCommit({
      owner,
      repo,
      commit_sha: project.gitLastCommitSha,
    });

    // Fetch all project files with storage URLs
    const allFiles = (await convex.query(api.system.getProjectFilesWithUrls, {
      internalKey,
      projectId: projectId as Id<"projects">,
    })) as FileWithUrl[];

    // Build full path map
    const fileMap = new Map<Id<"files">, FileWithUrl>();
    allFiles.forEach((f) => fileMap.set(f._id, f));

    const getFullPath = (file: FileWithUrl): string => {
      if (!file.parentId) return file.name;
      const parent = fileMap.get(file.parentId);
      if (!parent) return file.name;
      return `${getFullPath(parent)}/${file.name}`;
    };

    const localPathToFile: Record<string, FileWithUrl> = {};
    allFiles.forEach((f) => {
      if (f.type === "file") localPathToFile[getFullPath(f)] = f;
    });

    // Create blobs for staged files
    const stagedSet = new Set(stagedPaths);
    const treeUpdates: { path: string; mode: "100644"; type: "blob"; sha: string | null }[] = [];

    for (const path of stagedSet) {
      const file = localPathToFile[path];

      if (!file) {
        treeUpdates.push({ path, mode: "100644", type: "blob", sha: null });
        continue;
      }

      let content: string;
      let encoding: "utf-8" | "base64" = "utf-8";

      if (file.content !== undefined) {
        content = file.content;
      } else if (file.storageUrl) {
        const response = await ky.get(file.storageUrl);
        const buffer = Buffer.from(await response.arrayBuffer());
        content = buffer.toString("base64");
        encoding = "base64";
      } else {
        continue;
      }

      const { data: blob } = await octokit.rest.git.createBlob({ owner, repo, content, encoding });
      treeUpdates.push({ path, mode: "100644", type: "blob", sha: blob.sha });
    }

    // Create new tree
    const { data: newTree } = await octokit.rest.git.createTree({
      owner,
      repo,
      base_tree: parentCommit.tree.sha,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tree: treeUpdates as any,
    });

    // Create commit
    const { data: newCommit } = await octokit.rest.git.createCommit({
      owner,
      repo,
      message,
      tree: newTree.sha,
      parents: [project.gitLastCommitSha],
    });

    // Update branch ref
    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${project.gitBranch}`,
      sha: newCommit.sha,
      force: true,
    });

    // Prepend new commit to cached history (keep last 60)
    const existingHistory: { sha: string; message: string; author: string; date: string; parents: string[] }[] =
      project.gitCommitHistory ? JSON.parse(project.gitCommitHistory) : [];
    const gitCommitHistory = JSON.stringify([
      {
        sha: newCommit.sha,
        message: (message.split("\n")[0] ?? "").trim(),
        author: newCommit.author?.name ?? newCommit.committer?.name ?? "Unknown",
        date: newCommit.author?.date ?? new Date().toISOString(),
        parents: [project.gitLastCommitSha],
      },
      ...existingHistory.slice(0, 59),
    ]);

    // Merge treeUpdates into cached remote tree
    const currentRemoteTree: { path: string; sha: string }[] = project.gitRemoteTree
      ? JSON.parse(project.gitRemoteTree)
      : [];
    const treeMap = new Map(currentRemoteTree.map((e) => [e.path, e.sha]));
    for (const update of treeUpdates) {
      if (update.sha !== null) {
        treeMap.set(update.path, update.sha);
      } else {
        treeMap.delete(update.path);
      }
    }
    const gitRemoteTree = JSON.stringify(
      Array.from(treeMap.entries()).map(([path, sha]) => ({ path, sha })),
    );

    // Save git state to Convex
    await convex.mutation(api.system.updateGitStateInternal, {
      internalKey,
      projectId: projectId as Id<"projects">,
      gitLastCommitSha: newCommit.sha,
      gitRemoteTree,
      gitCommitHistory,
      clearGitSyncStatus: true,
    });

    return NextResponse.json({ success: true, commitSha: newCommit.sha });
  } catch (err) {
    // Clear syncing status on failure
    await convex.mutation(api.system.updateGitStateInternal, {
      internalKey,
      projectId: projectId as Id<"projects">,
      clearGitSyncStatus: true,
    }).catch(() => {});

    const message = err instanceof Error ? err.message : "Commit failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
