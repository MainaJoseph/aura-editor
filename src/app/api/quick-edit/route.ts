// import { z } from "zod";
// import { generateText, Output } from "ai";
// import { NextResponse } from "next/server";
// import { auth } from "@clerk/nextjs/server";
// // import { anthropic } from "@ai-sdk/anthropic";
// import { google } from "@ai-sdk/google";

// import { firecrawl } from "@/lib/firecrawl";

// const quickEditSchema = z.object({
//   editedCode: z
//     .string()
//     .describe(
//       "The edited version of the selected code based on the instruction"
//     ),
// });

// const URL_REGEX = /https?:\/\/[^\s)>\]]+/g;

// const QUICK_EDIT_PROMPT = `You are a code editing assistant. Edit the selected code based on the user's instruction.

// <context>
// <selected_code>
// {selectedCode}
// </selected_code>
// <full_code_context>
// {fullCode}
// </full_code_context>
// </context>

// {documentation}

// <instruction>
// {instruction}
// </instruction>

// <instructions>
// Return ONLY the edited version of the selected code.
// Maintain the same indentation level as the original.
// Do not include any explanations or comments unless requested.
// If the instruction is unclear or cannot be applied, return the original code unchanged.
// </instructions>`;

// export async function POST(request: Request) {
//   try {
//     const { userId } = await auth();
//     const { selectedCode, fullCode, instruction } = await request.json();

//     if (!userId) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 400 });
//     }

//     if (!selectedCode) {
//       return NextResponse.json(
//         { error: "Selected code is required" },
//         { status: 400 }
//       );
//     }

//     if (!instruction) {
//       return NextResponse.json(
//         { error: "Instruction is required" },
//         { status: 400 }
//       );
//     }

//     const urls: string[] = instruction.match(URL_REGEX) || [];
//     let documentationContext = "";

//     if (urls.length > 0) {
//       const scrapedResults = await Promise.all(
//         urls.map(async (url) => {
//           try {
//             const result = await firecrawl.scrape(url, {
//               formats: ["markdown"],
//             });

//             if (result.markdown) {
//               return `<doc url="${url}">\n${result.markdown}\n</doc>`;
//             }

//             return null;
//           } catch {
//             return null;
//           }
//         })
//       );

//       const validResults = scrapedResults.filter(Boolean);

//       if (validResults.length > 0) {
//         documentationContext = `<documentation>\n${validResults.join("\n\n")}\n</documentation>`;
//       }
//     }

//     const prompt = QUICK_EDIT_PROMPT.replace("{selectedCode}", selectedCode)
//       .replace("{fullCode}", fullCode || "")
//       .replace("{instruction}", instruction)
//       .replace("{documentation}", documentationContext);

//     const { output } = await generateText({
//       model: google("gemini-1.5-flash"),
//       output: Output.object({ schema: quickEditSchema }),
//       prompt,
//     });

//     return NextResponse.json({ editedCode: output.editedCode });
//   } catch (error) {
//     console.error("Edit error:", error);
//     return NextResponse.json(
//       { error: "Failed to generate edit" },
//       { status: 500 }
//     );
//   }
// }

import { generateText } from "ai";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { groq } from "@ai-sdk/groq";

import { firecrawl } from "@/lib/firecrawl";

const URL_REGEX = /https?:\/\/[^\s)>\]]+/g;

const QUICK_EDIT_PROMPT = `You are a code editing assistant. Edit the selected code based on the user's instruction.

<context>
<selected_code>
{selectedCode}
</selected_code>
<full_code_context>
{fullCode}
</full_code_context>
</context>

{documentation}

<instruction>
{instruction}
</instruction>

<instructions>
Return ONLY the edited version of the selected code.
Maintain the same indentation level as the original.
Do not include any explanations or comments unless requested.
If the instruction is unclear or cannot be applied, return the original code unchanged.

IMPORTANT: Respond ONLY with valid JSON in this exact format, no other text:
{"editedCode": "your edited code here"}
</instructions>`;

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    const { selectedCode, fullCode, instruction } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 400 });
    }

    if (!selectedCode) {
      return NextResponse.json(
        { error: "Selected code is required" },
        { status: 400 }
      );
    }

    if (!instruction) {
      return NextResponse.json(
        { error: "Instruction is required" },
        { status: 400 }
      );
    }

    const urls: string[] = instruction.match(URL_REGEX) || [];
    let documentationContext = "";

    if (urls.length > 0) {
      const scrapedResults = await Promise.all(
        urls.map(async (url) => {
          try {
            const result = await firecrawl.scrape(url, {
              formats: ["markdown"],
            });

            if (result.markdown) {
              return `<doc url="${url}">\n${result.markdown}\n</doc>`;
            }

            return null;
          } catch {
            return null;
          }
        })
      );

      const validResults = scrapedResults.filter(Boolean);

      if (validResults.length > 0) {
        documentationContext = `<documentation>\n${validResults.join("\n\n")}\n</documentation>`;
      }
    }

    const prompt = QUICK_EDIT_PROMPT.replace("{selectedCode}", selectedCode)
      .replace("{fullCode}", fullCode || "")
      .replace("{instruction}", instruction)
      .replace("{documentation}", documentationContext);

    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt,
      temperature: 0.3,
    });

    // Parse JSON response, handling potential formatting issues
    let editedCode = selectedCode; // Fallback to original code
    try {
      // Remove any markdown code blocks if present
      const cleanedText = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      const parsed = JSON.parse(cleanedText);
      editedCode = parsed.editedCode || selectedCode;
    } catch (parseError) {
      console.error("Failed to parse JSON response:", text);
      // Fallback: try to extract editedCode from malformed response
      const match = text.match(/"editedCode"\s*:\s*"([^"]*)"/);
      editedCode = match ? match[1] : selectedCode;
    }

    return NextResponse.json({ editedCode });
  } catch (error) {
    console.error("Edit error:", error);
    return NextResponse.json(
      { error: "Failed to generate edit" },
      { status: 500 }
    );
  }
}
