import ky from "ky";
import { Octokit } from "octokit";
import { NonRetriableError } from "inngest";
import { createClerkClient } from "@clerk/backend";

import { convex } from "@/lib/convex-client";
import { inngest } from "@/inngest/client";

import { api } from "../../../../convex/_generated/api";
import { Doc, Id } from "../../../../convex/_generated/dataModel";

interface GitCommitEvent {
  projectId: Id<"projects">;
  message: string;
  stagedPaths: string[];
  userId: string;
}

type FileWithUrl = Doc<"files"> & {
  storageUrl: string | null;
};

export const gitCommit = inngest.createFunction(
  {
    id: "git-commit",
    onFailure: async ({ event, step }) => {
      const internalKey = process.env.AURA_CONVEX_INTERNAL_KEY;
      if (!internalKey) return;

      const { projectId } = event.data.event.data as GitCommitEvent;

      await step.run("clear-sync-status", async () => {
        await convex.mutation(api.system.updateGitStateInternal, {
          internalKey,
          projectId,
          clearGitSyncStatus: true,
        });
      });
    },
  },
  { event: "github/git.commit" },
  async ({ event, step }) => {
    const { projectId, message, stagedPaths, userId } =
      event.data as GitCommitEvent;

    const internalKey = process.env.AURA_CONVEX_INTERNAL_KEY;
    if (!internalKey) {
      throw new NonRetriableError("AURA_CONVEX_INTERNAL_KEY is not configured");
    }

    await step.run("set-committing-status", async () => {
      await convex.mutation(api.system.updateGitStateInternal, {
        internalKey,
        projectId,
        gitSyncStatus: "committing",
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
      if (!p || !p.gitRepo || !p.gitBranch || !p.gitLastCommitSha) {
        throw new NonRetriableError("Project not connected to a git repository");
      }
      return p;
    });

    const [owner, repo] = project.gitRepo!.split("/");
    const octokit = new Octokit({ auth: githubToken });

    // Get current HEAD commit to find base tree SHA
    const { data: parentCommit } = await step.run("get-parent-commit", async () => {
      return await octokit.rest.git.getCommit({
        owner,
        repo,
        commit_sha: project.gitLastCommitSha!,
      });
    });

    // Fetch all project files (we only need staged ones)
    const allFiles = await step.run("fetch-project-files", async () => {
      return (await convex.query(api.system.getProjectFilesWithUrls, {
        internalKey,
        projectId,
      })) as FileWithUrl[];
    });

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
      if (f.type === "file") {
        localPathToFile[getFullPath(f)] = f;
      }
    });

    // Create blobs for staged files (only the ones that exist locally — not deleted)
    const stagedSet = new Set(stagedPaths);
    const treeUpdates = await step.run("create-blobs", async () => {
      const items: {
        path: string;
        mode: "100644";
        type: "blob";
        sha: string | null;
      }[] = [];

      for (const path of stagedSet) {
        const file = localPathToFile[path];

        if (!file) {
          // File was deleted — mark for removal from tree
          items.push({ path, mode: "100644", type: "blob", sha: null });
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

        const { data: blob } = await octokit.rest.git.createBlob({
          owner,
          repo,
          content,
          encoding,
        });

        items.push({ path, mode: "100644", type: "blob", sha: blob.sha });
      }

      return items;
    });

    // Build a new tree on top of the parent commit's tree
    const { data: newTree } = await step.run("create-tree", async () => {
      // GitHub API: items with sha: null remove the file from the tree
      // GitHub API: sha: null removes a file from the tree
      // Octokit types don't allow null, so we cast
      const treeEntries = treeUpdates.map((item) => ({
        path: item.path,
        mode: item.mode as "100644",
        type: item.type as "blob",
        sha: item.sha as string, // null sha removes the file — GitHub supports this
      }));

      return await octokit.rest.git.createTree({
        owner,
        repo,
        base_tree: parentCommit.tree.sha,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tree: treeEntries as any,
      });
    });

    // Create the commit
    const { data: newCommit } = await step.run("create-commit", async () => {
      return await octokit.rest.git.createCommit({
        owner,
        repo,
        message,
        tree: newTree.sha,
        parents: [project.gitLastCommitSha!],
      });
    });

    // Update branch ref
    await step.run("update-branch-ref", async () => {
      return await octokit.rest.git.updateRef({
        owner,
        repo,
        ref: `heads/${project.gitBranch}`,
        sha: newCommit.sha,
        force: true,
      });
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
        parents: [project.gitLastCommitSha!],
      },
      ...existingHistory.slice(0, 59),
    ]);

    // Merge treeUpdates into the cached remote tree
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

    // Update Convex with new commit SHA, remote tree, and commit history
    await step.run("save-git-state", async () => {
      await convex.mutation(api.system.updateGitStateInternal, {
        internalKey,
        projectId,
        gitLastCommitSha: newCommit.sha,
        gitRemoteTree,
        gitCommitHistory,
        clearGitSyncStatus: true,
      });
    });

    return { success: true, commitSha: newCommit.sha };
  },
);
