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

    // ── Phase 1: Confirm GitHub access with lightweight metadata fetches ─────
    // get-head-sha and fetch-repo-tree together verify the token is valid and the
    // full file tree is accessible. Cleanup only runs after both succeed, so a
    // token expiry or network error leaves existing project files intact.
    // Per-file blob fetch failures after cleanup are tracked and excluded from
    // gitRemoteTree — they are far less likely than whole-operation failures.

    // Get HEAD SHA first to pin the tree to a specific commit (TOCTOU fix)
    const headSha = await step.run("get-head-sha", async () => {
      const { data: ref } = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${project.gitBranch}`,
      });
      return ref.object.sha;
    });

    // Fetch the repo tree pinned to headSha (not the mutable branch name).
    // Returns only path/sha/type metadata — well within step output limits.
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

    // ── Phase 2: Write to the database ───────────────────────────────────────

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

    // Fetch each blob and write it immediately — file content is never held in
    // step output, avoiding Inngest's per-step size limit. Only failed paths are
    // returned (small string array).
    const allFiles = tree.tree.filter(
      (item) => item.type === "blob" && item.path && item.sha,
    );

    const failedPaths = await step.run("create-files", async () => {
      const failed: string[] = [];

      for (const file of allFiles) {
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
          const parentId = parentPath ? folderIdMap[parentPath] : undefined;

          if (isBinary) {
            const uploadUrl = await convex.mutation(api.system.generateUploadUrl, {
              internalKey,
            });
            const { storageId } = await ky
              .post(uploadUrl, {
                headers: { "Content-Type": "application/octet-stream" },
                body: buffer as unknown as BodyInit,
              })
              .json<{ storageId: Id<"_storage"> }>();

            await convex.mutation(api.system.createBinaryFile, {
              internalKey,
              projectId,
              name,
              storageId,
              parentId,
            });
          } else {
            await convex.mutation(api.system.createFile, {
              internalKey,
              projectId,
              name,
              content: buffer.toString("utf-8"),
              parentId,
            });
          }
        } catch (error) {
          console.error(`Failed to fetch/write file: ${file.path}`, error);
          failed.push(file.path);
        }
      }

      return failed;
    });

    // Build remote tree cache — exclude files that failed to fetch or write
    const failedSet = new Set(failedPaths);
    const gitRemoteTree = JSON.stringify(
      tree.tree
        .filter((e) => e.type === "blob" && e.path && e.sha && !failedSet.has(e.path))
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

    return { success: true, headSha, failedFiles: failedPaths };
  },
);
