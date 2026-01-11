// import { generateText } from "ai";
// import { inngest } from "./client";
// import { anthropic } from "@ai-sdk/anthropic";

// export const demoGenerate = inngest.createFunction(
//   { id: "demo-generate" },
//   { event: "demo/generate" },
//   async ({ step }) => {
//     await step.run("generate-text", async () => {
//       return await generateText({
//         model: anthropic("claude-3-haiku-20240307"),
//         prompt: "Write a vegetarian lasagna recipe for 4 people.",
//       });
//     });
//   }
// );

import { generateText } from "ai";
import { inngest } from "./client";
import { google } from "@ai-sdk/google";

export const demoGenerate = inngest.createFunction(
  { id: "demo-generate" },
  { event: "demo/generate" },
  async ({ step }) => {
    await step.run("generate-text", async () => {
      return await generateText({
        model: google("gemini-2.5-flash"),
        prompt: "Write a Vegetarian Lasagna recipe for 4 people",
      });
    });
  }
);
