// import { generateText, Output } from "ai";
// import { auth } from "@clerk/nextjs/server";
// import { NextResponse } from "next/server";
// import { z } from "zod";
// // import { anthropic } from "@ai-sdk/anthropic";
// import { google } from "@ai-sdk/google";
// // import { deepseek } from "@ai-sdk/deepseek";
// import { createGroq } from "@ai-sdk/groq";

// const suggestionSchema = z.object({
//   suggestion: z
//     .string()
//     .describe(
//       "The code to insert at cursor, or empty string if no completion needed"
//     ),
// });

// const SUGGESTION_PROMPT = `You are a code suggestion assistant.

// <context>
// <file_name>{fileName}</file_name>
// <previous_lines>
// {previousLines}
// </previous_lines>
// <current_line number="{lineNumber}">{currentLine}</current_line>
// <before_cursor>{textBeforeCursor}</before_cursor>
// <after_cursor>{textAfterCursor}</after_cursor>
// <next_lines>
// {nextLines}
// </next_lines>
// <full_code>
// {code}
// </full_code>
// </context>

// <instructions>
// Follow these steps IN ORDER:

// 1. First, look at next_lines. If next_lines contains ANY code, check if it continues from where the cursor is. If it does, return empty string immediately - the code is already written.

// 2. Check if before_cursor ends with a complete statement (;, }, )). If yes, return empty string.

// 3. Only if steps 1 and 2 don't apply: suggest what should be typed at the cursor position, using context from full_code.

// Your suggestion is inserted immediately after the cursor, so never suggest code that's already in the file.
// </instructions>`;

// export async function POST(request: Request) {
//   try {
//     const { userId } = await auth();

//     if (!userId) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
//     }

//     const {
//       fileName,
//       code,
//       currentLine,
//       previousLines,
//       textBeforeCursor,
//       textAfterCursor,
//       nextLines,
//       lineNumber,
//     } = await request.json();

//     if (!code) {
//       return NextResponse.json({ error: "Code is required" }, { status: 400 });
//     }

//     const prompt = SUGGESTION_PROMPT.replace("{fileName}", fileName)
//       .replace("{code}", code)
//       .replace("{currentLine}", currentLine)
//       .replace("{previousLines}", previousLines || "")
//       .replace("{textBeforeCursor}", textBeforeCursor)
//       .replace("{textAfterCursor}", textAfterCursor)
//       .replace("{nextLines}", nextLines || "")
//       .replace("{lineNumber}", lineNumber.toString());

//     const { output } = await generateText({
//       model: google("gemini-2.0-flash-exp"),
//       output: Output.object({ schema: suggestionSchema }),
//       prompt,
//     });

//     return NextResponse.json({ suggestion: output.suggestion });
//   } catch (error) {
//     console.error("Suggestion error: ", error);
//     return NextResponse.json(
//       { error: "Failed to generate suggestion" },
//       { status: 500 }
//     );
//   }
// }

import { generateText } from "ai";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { groq } from "@ai-sdk/groq";

const SUGGESTION_PROMPT = `You are a code suggestion assistant.

<context>
<file_name>{fileName}</file_name>
<previous_lines>
{previousLines}
</previous_lines>
<current_line number="{lineNumber}">{currentLine}</current_line>
<before_cursor>{textBeforeCursor}</before_cursor>
<after_cursor>{textAfterCursor}</after_cursor>
<next_lines>
{nextLines}
</next_lines>
<full_code>
{code}
</full_code>
</context>

<instructions>
Follow these steps IN ORDER:

1. First, look at next_lines. If next_lines contains ANY code, check if it continues from where the cursor is. If it does, return empty string immediately - the code is already written.

2. Check if before_cursor ends with a complete statement (;, }, )). If yes, return empty string.

3. Only if steps 1 and 2 don't apply: suggest what should be typed at the cursor position, using context from full_code.

Your suggestion is inserted immediately after the cursor, so never suggest code that's already in the file.

IMPORTANT: Respond ONLY with valid JSON in this exact format, no other text:
{"suggestion": "your code suggestion here or empty string"}
</instructions>`;

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const {
      fileName,
      code,
      currentLine,
      previousLines,
      textBeforeCursor,
      textAfterCursor,
      nextLines,
      lineNumber,
    } = await request.json();

    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    const prompt = SUGGESTION_PROMPT.replace("{fileName}", fileName)
      .replace("{code}", code)
      .replace("{currentLine}", currentLine)
      .replace("{previousLines}", previousLines || "")
      .replace("{textBeforeCursor}", textBeforeCursor)
      .replace("{textAfterCursor}", textAfterCursor)
      .replace("{nextLines}", nextLines || "")
      .replace("{lineNumber}", lineNumber.toString());

    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt,
      temperature: 0.3, // Lower temperature for more consistent formatting
    });

    // Parse JSON response, handling potential formatting issues
    let suggestion = "";
    try {
      // Remove any markdown code blocks if present
      const cleanedText = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      const parsed = JSON.parse(cleanedText);
      suggestion = parsed.suggestion || "";
    } catch (parseError) {
      console.error("Failed to parse JSON response:", text);
      // Fallback: try to extract suggestion from malformed response
      const match = text.match(/"suggestion"\s*:\s*"([^"]*)"/);
      suggestion = match ? match[1] : "";
    }

    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error("Suggestion error: ", error);
    return NextResponse.json(
      { error: "Failed to generate suggestion" },
      { status: 500 }
    );
  }
}
