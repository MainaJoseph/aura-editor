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

  // Validate gitRepo format before destructuring
  const repoParts = project.gitRepo.split("/");
  if (repoParts.length !== 2 || !repoParts[0] || !repoParts[1]) {
    throw new Error(`Invalid gitRepo format: ${project.gitRepo}`);
  }
  const [owner, repo] = repoParts;
  const octokit = new Octokit({ auth: githubToken });

  // Set pulling status
  await convex.mutation(api.system.updateGitStateInternal, {
    internalKey,
    projectId: projectId as Id<"projects">,
    gitSyncStatus: "pulling",
  });

  type FetchedFile =
    | { path: string; name: string; parentPath: string; isBinary: false; content: string }
    | { path: string; name: string; parentPath: string; isBinary: true; base64: string };

  try {
    // ── Phase 1: Fetch all GitHub data BEFORE touching the database ──────────
    // This ensures that if the GitHub API fails (expired token, network error,
    // etc.) the existing project files remain intact.

    // Fetch HEAD SHA first so the tree is pinned to the same commit.
    // Using the branch name for both calls would create a TOCTOU window where
    // a push landing between the two fetches causes headSha to differ from
    // the tree that was actually pulled.
    const { data: ref } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${project.gitBranch}`,
    });
    const headSha = ref.object.sha;

    // Fetch the repo tree pinned to headSha (not the branch name)
    const { data: tree } = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: headSha,
      recursive: "1",
    });

    // Abort if the tree is truncated — GitHub caps recursive trees at 100,000
    // entries / 7 MB. Proceeding on a partial tree would delete existing files
    // and only restore a subset of them.
    if (tree.truncated) {
      throw new Error(
        "Repository tree is too large for the GitHub API recursive endpoint (>100,000 entries or >7 MB). Pull aborted to avoid data loss.",
      );
    }

    // Fetch commit history (non-fatal)
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
    } catch (error) {
      console.warn("Failed to fetch commit history (non-fatal):", error);
    }

    // Pre-fetch all file blobs so any GitHub API failure happens before cleanup
    const allFileItems = tree.tree.filter((item) => item.type === "blob" && item.path && item.sha);
    const fetchedFiles: FetchedFile[] = [];
    const failedFiles: string[] = [];

    for (const file of allFileItems) {
      if (!file.path || !file.sha) continue;
      try {
        const { data: blob } = await octokit.rest.git.getBlob({ owner, repo, file_sha: file.sha });
        const buffer = Buffer.from(blob.content, "base64");
        const isBinary = await isBinaryFile(buffer);

        const pathParts = file.path.split("/");
        const name = pathParts.pop()!;
        const parentPath = pathParts.join("/");

        if (isBinary) {
          // Store raw base64 string — avoids Uint8Array<ArrayBufferLike> generic type issues
          fetchedFiles.push({ path: file.path, name, parentPath, isBinary: true, base64: blob.content });
        } else {
          fetchedFiles.push({ path: file.path, name, parentPath, isBinary: false, content: buffer.toString("utf-8") });
        }
      } catch (error) {
        console.error(`Failed to fetch file blob: ${file.path}`, error);
        failedFiles.push(file.path);
      }
    }

    // ── Phase 2: Write to the database ───────────────────────────────────────
    // All GitHub API calls succeeded. Now safe to replace existing files.
    // Trade-off: a Convex failure between cleanup and writes would still leave
    // the project empty, but Convex mutations are significantly more reliable
    // than external API calls and a full cross-mutation transaction is not
    // currently supported.

    // Cleanup existing files
    await convex.mutation(api.system.cleanup, {
      internalKey,
      projectId: projectId as Id<"projects">,
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

    // Write pre-fetched files to Convex
    for (const fileData of fetchedFiles) {
      try {
        const parentId = fileData.parentPath ? folderIdMap[fileData.parentPath] : undefined;

        if (fileData.isBinary) {
          const uploadUrl = await convex.mutation(api.system.generateUploadUrl, { internalKey });
          const binaryBuffer = Buffer.from(fileData.base64, "base64");
          const { storageId } = await ky
            .post(uploadUrl, {
              headers: { "Content-Type": "application/octet-stream" },
              body: binaryBuffer as unknown as BodyInit,
            })
            .json<{ storageId: Id<"_storage"> }>();

          await convex.mutation(api.system.createBinaryFile, {
            internalKey,
            projectId: projectId as Id<"projects">,
            name: fileData.name,
            storageId,
            parentId,
          });
        } else {
          await convex.mutation(api.system.createFile, {
            internalKey,
            projectId: projectId as Id<"projects">,
            name: fileData.name,
            content: fileData.content,
            parentId,
          });
        }
      } catch (error) {
        console.error(`Failed to write file: ${fileData.path}`, error);
        failedFiles.push(fileData.path);
      }
    }

    // Build remote tree cache after all writes — exclude files that failed
    // in either Phase 1 (blob fetch) or Phase 2 (Convex write).
    const failedSet = new Set(failedFiles);
    const gitRemoteTree = JSON.stringify(
      tree.tree
        .filter((e) => e.type === "blob" && e.path && e.sha && !failedSet.has(e.path))
        .map((e) => ({ path: e.path!, sha: e.sha! })),
    );

    // Save state
    await convex.mutation(api.system.updateGitStateInternal, {
      internalKey,
      projectId: projectId as Id<"projects">,
      gitLastCommitSha: headSha,
      gitRemoteTree,
      ...(gitCommitHistory ? { gitCommitHistory } : {}),
      clearGitSyncStatus: true,
    });

    return { headSha, failedFiles };
  } catch (err) {
    // Always clear sync status on failure to prevent stuck "pulling" state
    await convex.mutation(api.system.updateGitStateInternal, {
      internalKey,
      projectId: projectId as Id<"projects">,
      clearGitSyncStatus: true,
    }).catch(() => {});
    throw err;
  }
}
