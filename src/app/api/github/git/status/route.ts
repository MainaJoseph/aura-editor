import crypto from "crypto";
import { Octokit } from "octokit";
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

import { convex } from "@/lib/convex-client";

import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";

function computeGitBlobSha(content: string): string {
  const buf = Buffer.from(content, "utf-8");
  const header = `blob ${buf.byteLength}\0`;
  const hash = crypto.createHash("sha1");
  hash.update(header);
  hash.update(buf);
  return hash.digest("hex");
}

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

  if (!project.gitRepo || !project.gitBranch || !project.gitLastCommitSha) {
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

  const repoParts = project.gitRepo.split("/");
  if (repoParts.length !== 2 || !repoParts[0] || !repoParts[1]) {
    return NextResponse.json({ error: "Invalid git repository format" }, { status: 400 });
  }
  const [owner, repo] = repoParts;
  const octokit = new Octokit({ auth: githubToken });

  // Fetch the remote tree at the stored commit SHA
  let remoteTree: { path?: string; sha?: string; type?: string }[] = [];
  try {
    const { data } = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: project.gitLastCommitSha,
      recursive: "1",
    });
    remoteTree = data.tree;
  } catch {
    return NextResponse.json({ error: "Failed to fetch remote tree" }, { status: 500 });
  }

  // Get the latest remote commit SHA to detect if remote is ahead
  let remoteSha = project.gitLastCommitSha;
  try {
    const { data: ref } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${project.gitBranch}`,
    });
    remoteSha = ref.object.sha;
  } catch {
    // non-fatal, proceed with stored SHA
  }

  // Build remote path → sha map (only blobs)
  const remotePathToSha: Record<string, string> = {};
  for (const item of remoteTree) {
    if (item.type === "blob" && item.path && item.sha) {
      remotePathToSha[item.path] = item.sha;
    }
  }

  // Fetch all local files
  const localFiles = await convex.query(api.system.getProjectFilesWithUrls, {
    internalKey,
    projectId: projectId as Id<"projects">,
  });

  // Build full path map for local files
  type LocalFile = (typeof localFiles)[number];
  const fileMap = new Map<string, LocalFile>();
  localFiles.forEach((f) => fileMap.set(f._id, f));

  const getFullPath = (file: LocalFile): string => {
    if (!file.parentId) return file.name;
    const parent = fileMap.get(file.parentId);
    if (!parent) return file.name;
    return `${getFullPath(parent)}/${file.name}`;
  };

  const localPathToFile: Record<string, LocalFile> = {};
  localFiles.forEach((f) => {
    if (f.type === "file") {
      localPathToFile[getFullPath(f)] = f;
    }
  });

  const modified: string[] = [];
  const added: string[] = [];
  const deleted: string[] = [];

  // Check for modified and added files
  for (const [path, file] of Object.entries(localPathToFile)) {
    if (file.content !== undefined) {
      const localSha = computeGitBlobSha(file.content);
      if (path in remotePathToSha) {
        if (localSha !== remotePathToSha[path]) {
          modified.push(path);
        }
      } else {
        added.push(path);
      }
    } else {
      // Binary files: if not in remote, it's added; otherwise assume unchanged (no SHA comparison)
      if (!(path in remotePathToSha)) {
        added.push(path);
      }
    }
  }

  // Check for deleted files
  for (const remotePath of Object.keys(remotePathToSha)) {
    if (!(remotePath in localPathToFile)) {
      deleted.push(remotePath);
    }
  }

  const remoteAhead = remoteSha !== project.gitLastCommitSha;

  // Cache the remote tree in Convex so the client can compute status reactively
  const remoteTreeJson = JSON.stringify(
    Object.entries(remotePathToSha).map(([path, sha]) => ({ path, sha })),
  );
  try {
    await convex.mutation(api.system.updateGitStateInternal, {
      internalKey,
      projectId: projectId as Id<"projects">,
      gitRemoteTree: remoteTreeJson,
    });
  } catch {
    // Non-fatal: status is still returned even if caching fails
  }

  return NextResponse.json({
    modified,
    added,
    deleted,
    remoteAhead,
    localSha: project.gitLastCommitSha,
    remoteSha,
  });
}
