// import { generateText, Output } from "ai";
// import { NextResponse } from "next/server";
// import { auth } from "@clerk/nextjs/server";
// import { google } from "@ai-sdk/google";
// import { z } from "zod";

// const explainSchema = z.object({
//   explanation: z
//     .string()
//     .describe("A clear explanation of what the selected code does"),
// });

// const EXPLAIN_PROMPT = `You are a code explanation assistant. Explain the selected code in a clear, concise manner.

// <context>
// <selected_code>
// {selectedCode}
// </selected_code>
// <full_code_context>
// {fullCode}
// </full_code_context>
// </context>

// <instructions>
// Provide a clear explanation of what the selected code does.
// Include:
// - What the code does (high-level purpose)
// - How it works (key logic and flow)
// - Any important details about the implementation
// - Potential use cases or context

// Keep the explanation concise but thorough.
// Use simple language and avoid unnecessary jargon.
// Format your response in markdown for better readability.
// </instructions>`;

// export async function POST(request: Request) {
//   try {
//     const { userId } = await auth();
//     const { selectedCode, fullCode } = await request.json();

//     if (!userId) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 400 });
//     }

//     if (!selectedCode) {
//       return NextResponse.json(
//         { error: "Selected code is required" },
//         { status: 400 }
//       );
//     }

//     const prompt = EXPLAIN_PROMPT.replace("{selectedCode}", selectedCode).replace(
//       "{fullCode}",
//       fullCode || ""
//     );

//     const { output } = await generateText({
//       model: google("gemini-1.5-flash"),
//       output: Output.object({ schema: explainSchema }),
//       prompt,
//     });

//     return NextResponse.json({ explanation: output.explanation });
//   } catch (error) {
//     console.error("Explain error:", error);
//     return NextResponse.json(
//       { error: "Failed to generate explanation" },
//       { status: 500 }
//     );
//   }
// }

import { generateText } from "ai";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { groq } from "@ai-sdk/groq";

const EXPLAIN_PROMPT = `You are a code explanation assistant. Explain the selected code in a clear, concise manner.

<context>
<selected_code>
{selectedCode}
</selected_code>
<full_code_context>
{fullCode}
</full_code_context>
</context>

<instructions>
Provide a clear explanation of what the selected code does.
Include:
- What the code does (high-level purpose)
- How it works (key logic and flow)
- Any important details about the implementation
- Potential use cases or context

Keep the explanation concise but thorough.
Use simple language and avoid unnecessary jargon.
Format your response in markdown for better readability.

IMPORTANT: Respond ONLY with valid JSON in this exact format, no other text:
{"explanation": "your markdown explanation here"}
</instructions>`;

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    const { selectedCode, fullCode } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 400 });
    }

    if (!selectedCode) {
      return NextResponse.json(
        { error: "Selected code is required" },
        { status: 400 }
      );
    }

    const prompt = EXPLAIN_PROMPT.replace(
      "{selectedCode}",
      selectedCode
    ).replace("{fullCode}", fullCode || "");

    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt,
      temperature: 0.3,
    });

    // Parse JSON response, handling potential formatting issues
    let explanation: string = "Unable to generate explanation.";
    try {
      // Remove any markdown code blocks if present
      const cleanedText = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      const parsed = JSON.parse(cleanedText) as { explanation?: string };
      explanation = parsed.explanation || explanation;
    } catch (parseError) {
      console.error("Failed to parse JSON response:", parseError, text);
      // Fallback: try to extract explanation from malformed response
      const match = text.match(/"explanation"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (match) {
        explanation = match[1]
          .replace(/\\n/g, "\n")
          .replace(/\\t/g, "\t")
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, "\\");
      } else {
        // If JSON parsing completely fails, use the raw text
        explanation = text.trim();
      }
    }

    return NextResponse.json({ explanation });
  } catch (error) {
    console.error("Explain error:", error);
    return NextResponse.json(
      { error: "Failed to generate explanation" },
      { status: 500 }
    );
  }
}
