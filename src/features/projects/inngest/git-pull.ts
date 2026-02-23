import ky from "ky";
import { Octokit } from "octokit";
import { isBinaryFile } from "isbinaryfile";
import { NonRetriableError } from "inngest";
import { createClerkClient } from "@clerk/backend";

import { convex } from "@/lib/convex-client";
import { inngest } from "@/inngest/client";

import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

interface GitPullEvent {
  projectId: Id<"projects">;
  userId: string;
}

// Serializable representation of a pre-fetched file (Buffer replaced with base64 string)
type FetchedFile =
  | { path: string; name: string; parentPath: string; isBinary: false; content: string }
  | { path: string; name: string; parentPath: string; isBinary: true; base64: string };

export const gitPull = inngest.createFunction(
  {
    id: "git-pull",
    onFailure: async ({ event, step }) => {
      const internalKey = process.env.AURA_CONVEX_INTERNAL_KEY;
      if (!internalKey) return;

      const { projectId } = event.data.event.data as GitPullEvent;

      await step.run("clear-sync-status", async () => {
        await convex.mutation(api.system.updateGitStateInternal, {
          internalKey,
          projectId,
          clearGitSyncStatus: true,
        });
      });
    },
  },
  { event: "github/git.pull" },
  async ({ event, step }) => {
    const { projectId, userId } = event.data as GitPullEvent;

    const internalKey = process.env.AURA_CONVEX_INTERNAL_KEY;
    if (!internalKey) {
      throw new NonRetriableError("AURA_CONVEX_INTERNAL_KEY is not configured");
    }

    await step.run("set-pulling-status", async () => {
      await convex.mutation(api.system.updateGitStateInternal, {
        internalKey,
        projectId,
        gitSyncStatus: "pulling",
      });
    });

    // Fetch token outside a step so Inngest does not persist credentials in step history
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    const tokens = await clerk.users.getUserOauthAccessToken(userId, "github");
    const githubToken = tokens.data[0]?.token;
    if (!githubToken) {
      throw new NonRetriableError("GitHub OAuth token not found for user");
    }

    const project = await step.run("fetch-project", async () => {
      const p = await convex.query(api.system.getProjectById, {
        internalKey,
        projectId,
      });
      if (!p || !p.gitRepo || !p.gitBranch) {
        throw new NonRetriableError("Project not connected to a git repository");
      }
      return p;
    });

    const repoParts = project.gitRepo!.split("/");
    if (repoParts.length !== 2 || !repoParts[0] || !repoParts[1]) {
      throw new NonRetriableError("Invalid gitRepo format, expected 'owner/repo'");
    }
    const [owner, repo] = repoParts;
    const octokit = new Octokit({ auth: githubToken });

    // ── Phase 1: Fetch all GitHub data BEFORE touching the database ──────────
    // Any failure here leaves existing project files completely intact.

    // Get HEAD SHA first so the tree fetch is pinned to the same commit (TOCTOU fix).
    // Using the branch name for both calls creates a window where a concurrent push
    // causes headSha to differ from the tree that was actually pulled.
    const headSha = await step.run("get-head-sha", async () => {
      const { data: ref } = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${project.gitBranch}`,
      });
      return ref.object.sha;
    });

    // Fetch the repo tree pinned to headSha (not the mutable branch name)
    const tree = await step.run("fetch-repo-tree", async () => {
      const { data } = await octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: headSha,
        recursive: "1",
      });
      return data;
    });

    // Fetch commit history before cleanup (non-fatal)
    const gitCommitHistory = await step.run("fetch-commit-history", async () => {
      try {
        const { data: commits } = await octokit.rest.repos.listCommits({
          owner,
          repo,
          sha: project.gitBranch!,
          per_page: 60,
        });
        return JSON.stringify(
          commits.map((c) => ({
            sha: c.sha,
            message: (c.commit.message.split("\n")[0] ?? "").trim(),
            author: c.commit.author?.name ?? c.commit.committer?.name ?? "Unknown",
            date: c.commit.author?.date ?? c.commit.committer?.date ?? "",
            parents: c.parents.map((p) => p.sha),
          })),
        );
      } catch {
        return null;
      }
    });

    // Pre-fetch all file blobs before any database writes.
    // Buffers are encoded as base64 strings to remain JSON-serializable across steps.
    const { fetchedFiles, fetchFailedPaths } = await step.run("fetch-file-blobs", async () => {
      const allFileItems = tree.tree.filter(
        (item) => item.type === "blob" && item.path && item.sha,
      );
      const fetched: FetchedFile[] = [];
      const failed: string[] = [];

      for (const file of allFileItems) {
        if (!file.path || !file.sha) continue;
        try {
          const { data: blob } = await octokit.rest.git.getBlob({
            owner,
            repo,
            file_sha: file.sha,
          });
          const buffer = Buffer.from(blob.content, "base64");
          const isBinary = await isBinaryFile(buffer);

          const pathParts = file.path.split("/");
          const name = pathParts.pop()!;
          const parentPath = pathParts.join("/");

          if (isBinary) {
            // Keep the raw base64 string — avoids Buffer serialization issues
            fetched.push({ path: file.path, name, parentPath, isBinary: true, base64: blob.content });
          } else {
            fetched.push({ path: file.path, name, parentPath, isBinary: false, content: buffer.toString("utf-8") });
          }
        } catch (error) {
          console.error(`Failed to fetch blob: ${file.path}`, error);
          failed.push(file.path);
        }
      }

      return { fetchedFiles: fetched, fetchFailedPaths: failed };
    });

    // ── Phase 2: Write to the database ───────────────────────────────────────
    // All GitHub API calls succeeded. Now safe to replace existing files.
    // Trade-off: a Convex failure between cleanup and writes would still leave
    // the project empty, but Convex mutations are far more reliable than
    // external API calls and cross-mutation transactions are not supported.

    await step.run("cleanup-project", async () => {
      await convex.mutation(api.system.cleanup, {
        internalKey,
        projectId,
      });
    });

    // Create folders in depth order
    const folders = tree.tree
      .filter((item) => item.type === "tree" && item.path)
      .sort((a, b) => {
        const aDepth = a.path ? a.path.split("/").length : 0;
        const bDepth = b.path ? b.path.split("/").length : 0;
        return aDepth - bDepth;
      });

    const folderIdMap = await step.run("create-folders", async () => {
      const map: Record<string, Id<"files">> = {};

      for (const folder of folders) {
        if (!folder.path) continue;

        const pathParts = folder.path.split("/");
        const name = pathParts.pop()!;
        const parentPath = pathParts.join("/");
        const parentId = parentPath ? map[parentPath] : undefined;

        const folderId = await convex.mutation(api.system.createFolder, {
          internalKey,
          projectId,
          name,
          parentId,
        });

        map[folder.path] = folderId;
      }

      return map;
    });

    // Write pre-fetched files and track any per-file write failures
    const writeFailedPaths = await step.run("create-files", async () => {
      const failed: string[] = [];

      for (const fileData of fetchedFiles) {
        try {
          const parentId = fileData.parentPath ? folderIdMap[fileData.parentPath] : undefined;

          if (fileData.isBinary) {
            const buffer = Buffer.from(fileData.base64, "base64");
            const uploadUrl = await convex.mutation(api.system.generateUploadUrl, {
              internalKey,
            });
            const { storageId } = await ky
              .post(uploadUrl, {
                headers: { "Content-Type": "application/octet-stream" },
                body: buffer,
              })
              .json<{ storageId: Id<"_storage"> }>();

            await convex.mutation(api.system.createBinaryFile, {
              internalKey,
              projectId,
              name: fileData.name,
              storageId,
              parentId,
            });
          } else {
            await convex.mutation(api.system.createFile, {
              internalKey,
              projectId,
              name: fileData.name,
              content: fileData.content,
              parentId,
            });
          }
        } catch (error) {
          console.error(`Failed to write file: ${fileData.path}`, error);
          failed.push(fileData.path);
        }
      }

      return failed;
    });

    // Build remote tree cache — exclude files that failed to fetch or write
    const allFailedPaths = new Set([...fetchFailedPaths, ...writeFailedPaths]);
    const gitRemoteTree = JSON.stringify(
      tree.tree
        .filter((e) => e.type === "blob" && e.path && e.sha && !allFailedPaths.has(e.path))
        .map((e) => ({ path: e.path!, sha: e.sha! })),
    );

    await step.run("save-git-state", async () => {
      await convex.mutation(api.system.updateGitStateInternal, {
        internalKey,
        projectId,
        gitLastCommitSha: headSha,
        gitRemoteTree,
        ...(gitCommitHistory ? { gitCommitHistory } : {}),
        clearGitSyncStatus: true,
      });
    });

    return { success: true, headSha, failedFiles: [...allFailedPaths] };
  },
);
