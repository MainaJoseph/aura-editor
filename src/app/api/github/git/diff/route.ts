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
  const path = searchParams.get("path");

  if (!projectId || !path) {
    return NextResponse.json({ error: "projectId and path are required" }, { status: 400 });
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

  // Fetch the remote tree to find the blob SHA for this path
  let remoteBlobSha: string | null = null;
  try {
    const { data: tree } = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: project.gitLastCommitSha,
      recursive: "1",
    });
    const entry = tree.tree.find((item) => item.path === path && item.type === "blob");
    remoteBlobSha = entry?.sha ?? null;
  } catch {
    // Remote tree unavailable — treat as new file
  }

  // Fetch old content from GitHub
  let oldContent: string | null = null;
  if (remoteBlobSha) {
    try {
      const { data: blob } = await octokit.rest.git.getBlob({
        owner,
        repo,
        file_sha: remoteBlobSha,
      });
      const buffer = Buffer.from(blob.content, "base64");
      oldContent = buffer.toString("utf-8");
    } catch {
      oldContent = null;
    }
  }

  // Fetch new content from Convex local files
  const localFiles = await convex.query(api.system.getProjectFilesWithUrls, {
    internalKey,
    projectId: projectId as Id<"projects">,
  });

  type LocalFile = (typeof localFiles)[number];
  const fileMap = new Map<string, LocalFile>();
  localFiles.forEach((f) => fileMap.set(f._id, f));

  const getFullPath = (file: LocalFile): string => {
    if (!file.parentId) return file.name;
    const parent = fileMap.get(file.parentId);
    if (!parent) return file.name;
    return `${getFullPath(parent)}/${file.name}`;
  };

  let newContent: string | null = null;
  for (const file of localFiles) {
    if (file.type === "file" && getFullPath(file) === path) {
      newContent = file.content ?? null;
      break;
    }
  }

  // Determine status
  let status: "M" | "A" | "D";
  if (oldContent === null && newContent !== null) {
    status = "A";
  } else if (oldContent !== null && newContent === null) {
    status = "D";
  } else {
    status = "M";
  }

  return NextResponse.json({ oldContent, newContent, path, status });
}
