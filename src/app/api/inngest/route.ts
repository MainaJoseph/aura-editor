import { serve } from "inngest/next";

import { inngest } from "@/inngest/client";
import { demoError, demoGenerate } from "@/inngest/functions";
import { processMessage } from "@/features/conversations/inngest/process-message";
import { importGithubRepo } from "@/features/projects/inngest/import-github-repo";
import { exportToGithub } from "@/features/projects/inngest/export-to-github";
import { gitConnect } from "@/features/projects/inngest/git-connect";
import { gitCommit } from "@/features/projects/inngest/git-commit";
import { gitPull } from "@/features/projects/inngest/git-pull";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    demoGenerate,
    demoError,
    processMessage,
    importGithubRepo,
    exportToGithub,
    gitConnect,
    gitCommit,
    gitPull,
  ],
});
