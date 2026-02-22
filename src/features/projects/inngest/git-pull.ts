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

    const githubToken = await step.run("fetch-github-token", async () => {
      const clerk = createClerkClient({
        secretKey: process.env.CLERK_SECRET_KEY,
      });
      const tokens = await clerk.users.getUserOauthAccessToken(userId, "github");
      const token = tokens.data[0]?.token;
      if (!token) {
        throw new NonRetriableError("GitHub OAuth token not found for user");
      }
      return token;
    });

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

    const [owner, repo] = project.gitRepo!.split("/");
    const octokit = new Octokit({ auth: githubToken });

    // Cleanup existing files
    await step.run("cleanup-project", async () => {
      await convex.mutation(api.system.cleanup, {
        internalKey,
        projectId,
      });
    });

    // Fetch the repo tree for the current branch
    const tree = await step.run("fetch-repo-tree", async () => {
      const { data } = await octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: project.gitBranch!,
        recursive: "1",
      });
      return data;
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

    // Create files
    const allFiles = tree.tree.filter(
      (item) => item.type === "blob" && item.path && item.sha,
    );

    await step.run("create-files", async () => {
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
                body: buffer,
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
        } catch {
          console.error(`Failed to pull file: ${file.path}`);
        }
      }
    });

    // Get the latest HEAD SHA for the branch
    const headSha = await step.run("get-head-sha", async () => {
      const { data: ref } = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${project.gitBranch}`,
      });
      return ref.object.sha;
    });

    // Build remote tree cache from the fetched tree
    const gitRemoteTree = JSON.stringify(
      tree.tree
        .filter((e) => e.type === "blob" && e.path && e.sha)
        .map((e) => ({ path: e.path!, sha: e.sha! })),
    );

    // Fetch commit history for the branch
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

    return { success: true, headSha };
  },
);
