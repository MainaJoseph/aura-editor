import ky from "ky";
import { Octokit } from "octokit";
import { isBinaryFile } from "isbinaryfile";

import { convex } from "@/lib/convex-client";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";

export async function performPull({
  projectId,
  githubToken,
  internalKey,
}: {
  projectId: string;
  githubToken: string;
  internalKey: string;
}) {
  const project = await convex.query(api.system.getProjectById, {
    internalKey,
    projectId: projectId as Id<"projects">,
  });

  if (!project || !project.gitRepo || !project.gitBranch) {
    throw new Error("Project not connected to a git repository");
  }

  const [owner, repo] = project.gitRepo.split("/");
  const octokit = new Octokit({ auth: githubToken });

  // Set pulling status
  await convex.mutation(api.system.updateGitStateInternal, {
    internalKey,
    projectId: projectId as Id<"projects">,
    gitSyncStatus: "pulling",
  });

  // Cleanup existing files
  await convex.mutation(api.system.cleanup, {
    internalKey,
    projectId: projectId as Id<"projects">,
  });

  // Fetch the repo tree for the current branch
  const { data: tree } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: project.gitBranch,
    recursive: "1",
  });

  // Create folders in depth order
  const folders = tree.tree
    .filter((item) => item.type === "tree" && item.path)
    .sort((a, b) => {
      const aDepth = a.path ? a.path.split("/").length : 0;
      const bDepth = b.path ? b.path.split("/").length : 0;
      return aDepth - bDepth;
    });

  const folderIdMap: Record<string, Id<"files">> = {};
  for (const folder of folders) {
    if (!folder.path) continue;
    const pathParts = folder.path.split("/");
    const name = pathParts.pop()!;
    const parentPath = pathParts.join("/");
    const parentId = parentPath ? folderIdMap[parentPath] : undefined;

    const folderId = await convex.mutation(api.system.createFolder, {
      internalKey,
      projectId: projectId as Id<"projects">,
      name,
      parentId,
    });
    folderIdMap[folder.path] = folderId;
  }

  // Create files
  const allFiles = tree.tree.filter((item) => item.type === "blob" && item.path && item.sha);
  for (const file of allFiles) {
    if (!file.path || !file.sha) continue;
    try {
      const { data: blob } = await octokit.rest.git.getBlob({ owner, repo, file_sha: file.sha });
      const buffer = Buffer.from(blob.content, "base64");
      const isBinary = await isBinaryFile(buffer);

      const pathParts = file.path.split("/");
      const name = pathParts.pop()!;
      const parentPath = pathParts.join("/");
      const parentId = parentPath ? folderIdMap[parentPath] : undefined;

      if (isBinary) {
        const uploadUrl = await convex.mutation(api.system.generateUploadUrl, { internalKey });
        const { storageId } = await ky
          .post(uploadUrl, {
            headers: { "Content-Type": "application/octet-stream" },
            body: buffer,
          })
          .json<{ storageId: Id<"_storage"> }>();

        await convex.mutation(api.system.createBinaryFile, {
          internalKey,
          projectId: projectId as Id<"projects">,
          name,
          storageId,
          parentId,
        });
      } else {
        await convex.mutation(api.system.createFile, {
          internalKey,
          projectId: projectId as Id<"projects">,
          name,
          content: buffer.toString("utf-8"),
          parentId,
        });
      }
    } catch {
      console.error(`Failed to pull file: ${file.path}`);
    }
  }

  // Get HEAD SHA
  const { data: ref } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${project.gitBranch}`,
  });
  const headSha = ref.object.sha;

  // Build remote tree cache
  const gitRemoteTree = JSON.stringify(
    tree.tree
      .filter((e) => e.type === "blob" && e.path && e.sha)
      .map((e) => ({ path: e.path!, sha: e.sha! })),
  );

  // Fetch commit history
  let gitCommitHistory: string | undefined;
  try {
    const { data: commits } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      sha: project.gitBranch,
      per_page: 60,
    });
    gitCommitHistory = JSON.stringify(
      commits.map((c) => ({
        sha: c.sha,
        message: (c.commit.message.split("\n")[0] ?? "").trim(),
        author: c.commit.author?.name ?? c.commit.committer?.name ?? "Unknown",
        date: c.commit.author?.date ?? c.commit.committer?.date ?? "",
        parents: c.parents.map((p) => p.sha),
      })),
    );
  } catch {
    // non-fatal
  }

  // Save state
  await convex.mutation(api.system.updateGitStateInternal, {
    internalKey,
    projectId: projectId as Id<"projects">,
    gitLastCommitSha: headSha,
    gitRemoteTree,
    ...(gitCommitHistory ? { gitCommitHistory } : {}),
    clearGitSyncStatus: true,
  });

  return { headSha };
}
