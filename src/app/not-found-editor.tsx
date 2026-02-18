"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type LangId = "typescript" | "python" | "go" | "rust" | "csharp";

interface LangLine {
  text: string;
  highlighted: React.ReactNode;
}

interface LangConfig {
  label: string;
  filename: string;
  badge: string;
  badgeColor: string;
  lines: LangLine[];
}

// ─── Helper: blank line ────────────────────────────────────────────────────────

const blank = (key: string): LangLine => ({
  text: "",
  highlighted: <span key={key}>&nbsp;</span>,
});

// ─── Language definitions ──────────────────────────────────────────────────────

const LANGUAGES: Record<LangId, LangConfig> = {

  // ── TypeScript ──────────────────────────────────────────────────────────────
  typescript: {
    label: "TypeScript",
    filename: "navigate.ts",
    badge: "TS",
    badgeColor: "text-[#4ec9b0]",
    lines: [
      {
        text: "async function navigate(path: string) {",
        highlighted: (
          <span>
            <span className="text-[#569cd6]">async function</span>{" "}
            <span className="text-[#dcdcaa]">navigate</span>
            <span className="text-white/60">(</span>
            <span className="text-[#9cdcfe]">path</span>
            <span className="text-white/40">:</span>{" "}
            <span className="text-[#4ec9b0]">string</span>
            <span className="text-white/60">) {"{"}</span>
          </span>
        ),
      },
      {
        text: "  const route = await router.resolve(path);",
        highlighted: (
          <span>
            {"  "}
            <span className="text-[#569cd6]">const</span>{" "}
            <span className="text-[#9cdcfe]">route</span>{" "}
            <span className="text-white/40">=</span>{" "}
            <span className="text-[#569cd6]">await</span>{" "}
            <span className="text-[#9cdcfe]">router</span>
            <span className="text-white/60">.</span>
            <span className="text-[#dcdcaa]">resolve</span>
            <span className="text-white/60">(</span>
            <span className="text-[#9cdcfe]">path</span>
            <span className="text-white/60">);</span>
          </span>
        ),
      },
      blank("ts-b1"),
      {
        text: "  if (!route) {",
        highlighted: (
          <span>
            {"  "}
            <span className="text-[#c586c0]">if</span>{" "}
            <span className="text-white/60">(!</span>
            <span className="text-[#9cdcfe]">route</span>
            <span className="text-white/60">) {"{"}</span>
          </span>
        ),
      },
      {
        text: "    // Oops... nothing lives here",
        highlighted: (
          <span>
            {"    "}
            <span className="text-[#6a9955] italic">{"// Oops... nothing lives here"}</span>
          </span>
        ),
      },
      {
        text: "    return {",
        highlighted: (
          <span>
            {"    "}
            <span className="text-[#c586c0]">return</span>{" "}
            <span className="text-white/60">{"{"}</span>
          </span>
        ),
      },
      {
        text: "      status: 404,",
        highlighted: (
          <span>
            {"      "}
            <span className="text-[#9cdcfe]">status</span>
            <span className="text-white/40">:</span>{" "}
            <span className="text-[#b5cea8]">404</span>
            <span className="text-white/60">,</span>
          </span>
        ),
      },
      {
        text: '      message: "Page not found",',
        highlighted: (
          <span>
            {"      "}
            <span className="text-[#9cdcfe]">message</span>
            <span className="text-white/40">:</span>{" "}
            <span className="text-[#ce9178]">&quot;Page not found&quot;</span>
            <span className="text-white/60">,</span>
          </span>
        ),
      },
      {
        text: "    };",
        highlighted: (
          <span>
            {"    "}
            <span className="text-white/60">{"}"}</span>
            <span className="text-white/60">;</span>
          </span>
        ),
      },
      {
        text: "  }",
        highlighted: <span>{"  "}<span className="text-white/60">{"}"}</span></span>,
      },
      blank("ts-b2"),
      {
        text: "  return route.render();",
        highlighted: (
          <span>
            {"  "}
            <span className="text-[#c586c0]">return</span>{" "}
            <span className="text-[#9cdcfe]">route</span>
            <span className="text-white/60">.</span>
            <span className="text-[#dcdcaa]">render</span>
            <span className="text-white/60">();</span>
          </span>
        ),
      },
      { text: "}", highlighted: <span className="text-white/60">{"}"}</span> },
      blank("ts-b3"),
      {
        text: "// → Navigating to current path...",
        highlighted: <span className="text-[#6a9955] italic">{"// → Navigating to current path..."}</span>,
      },
      {
        text: "navigate(window.location.pathname);",
        highlighted: (
          <span>
            <span className="text-[#dcdcaa]">navigate</span>
            <span className="text-white/60">(</span>
            <span className="text-[#9cdcfe]">window</span>
            <span className="text-white/60">.</span>
            <span className="text-[#9cdcfe]">location</span>
            <span className="text-white/60">.</span>
            <span className="text-[#9cdcfe]">pathname</span>
            <span className="text-white/60">);</span>
          </span>
        ),
      },
      blank("ts-b4"),
      {
        text: "// ✗ Error 404: Page not found",
        highlighted: <span className="text-[#f44747]">{"// ✗ Error 404: Page not found"}</span>,
      },
    ],
  },

  // ── Python ──────────────────────────────────────────────────────────────────
  python: {
    label: "Python",
    filename: "navigate.py",
    badge: "PY",
    badgeColor: "text-[#4ec9b0]",
    lines: [
      {
        text: "async def navigate(path: str) -> dict:",
        highlighted: (
          <span>
            <span className="text-[#569cd6]">async def</span>{" "}
            <span className="text-[#dcdcaa]">navigate</span>
            <span className="text-white/60">(</span>
            <span className="text-[#9cdcfe]">path</span>
            <span className="text-white/40">:</span>{" "}
            <span className="text-[#4ec9b0]">str</span>
            <span className="text-white/60">)</span>{" "}
            <span className="text-white/40">-{">"}</span>{" "}
            <span className="text-[#4ec9b0]">dict</span>
            <span className="text-white/60">:</span>
          </span>
        ),
      },
      {
        text: "    route = await router.resolve(path)",
        highlighted: (
          <span>
            {"    "}
            <span className="text-[#9cdcfe]">route</span>{" "}
            <span className="text-white/40">=</span>{" "}
            <span className="text-[#569cd6]">await</span>{" "}
            <span className="text-[#9cdcfe]">router</span>
            <span className="text-white/60">.</span>
            <span className="text-[#dcdcaa]">resolve</span>
            <span className="text-white/60">(</span>
            <span className="text-[#9cdcfe]">path</span>
            <span className="text-white/60">)</span>
          </span>
        ),
      },
      blank("py-b1"),
      {
        text: "    if not route:",
        highlighted: (
          <span>
            {"    "}
            <span className="text-[#c586c0]">if not</span>{" "}
            <span className="text-[#9cdcfe]">route</span>
            <span className="text-white/60">:</span>
          </span>
        ),
      },
      {
        text: "        # Oops... nothing lives here",
        highlighted: (
          <span>
            {"        "}
            <span className="text-[#6a9955] italic">{"# Oops... nothing lives here"}</span>
          </span>
        ),
      },
      {
        text: "        return {",
        highlighted: (
          <span>
            {"        "}
            <span className="text-[#c586c0]">return</span>{" "}
            <span className="text-white/60">{"{"}</span>
          </span>
        ),
      },
      {
        text: '            "status": 404,',
        highlighted: (
          <span>
            {"            "}
            <span className="text-[#ce9178]">&quot;status&quot;</span>
            <span className="text-white/40">:</span>{" "}
            <span className="text-[#b5cea8]">404</span>
            <span className="text-white/60">,</span>
          </span>
        ),
      },
      {
        text: '            "message": "Page not found",',
        highlighted: (
          <span>
            {"            "}
            <span className="text-[#ce9178]">&quot;message&quot;</span>
            <span className="text-white/40">:</span>{" "}
            <span className="text-[#ce9178]">&quot;Page not found&quot;</span>
            <span className="text-white/60">,</span>
          </span>
        ),
      },
      {
        text: "        }",
        highlighted: <span>{"        "}<span className="text-white/60">{"}"}</span></span>,
      },
      blank("py-b2"),
      {
        text: "    return route.render()",
        highlighted: (
          <span>
            {"    "}
            <span className="text-[#c586c0]">return</span>{" "}
            <span className="text-[#9cdcfe]">route</span>
            <span className="text-white/60">.</span>
            <span className="text-[#dcdcaa]">render</span>
            <span className="text-white/60">()</span>
          </span>
        ),
      },
      blank("py-b3"),
      blank("py-b4"),
      {
        text: "# → Navigating to current path...",
        highlighted: <span className="text-[#6a9955] italic">{"# → Navigating to current path..."}</span>,
      },
      {
        text: "navigate(request.path)",
        highlighted: (
          <span>
            <span className="text-[#dcdcaa]">navigate</span>
            <span className="text-white/60">(</span>
            <span className="text-[#9cdcfe]">request</span>
            <span className="text-white/60">.</span>
            <span className="text-[#9cdcfe]">path</span>
            <span className="text-white/60">)</span>
          </span>
        ),
      },
      blank("py-b5"),
      {
        text: "# ✗ Error 404: Page not found",
        highlighted: <span className="text-[#f44747]">{"# ✗ Error 404: Page not found"}</span>,
      },
      blank("py-b6"),
    ],
  },

  // ── Go ──────────────────────────────────────────────────────────────────────
  go: {
    label: "Go",
    filename: "navigate.go",
    badge: "GO",
    badgeColor: "text-[#00acd7]",
    lines: [
      {
        text: "func Navigate(path string) (*Response, error) {",
        highlighted: (
          <span>
            <span className="text-[#569cd6]">func</span>{" "}
            <span className="text-[#dcdcaa]">Navigate</span>
            <span className="text-white/60">(</span>
            <span className="text-[#9cdcfe]">path</span>{" "}
            <span className="text-[#4ec9b0]">string</span>
            <span className="text-white/60">)</span>{" "}
            <span className="text-white/60">(</span>
            <span className="text-white/40">*</span>
            <span className="text-[#4ec9b0]">Response</span>
            <span className="text-white/60">,</span>{" "}
            <span className="text-[#4ec9b0]">error</span>
            <span className="text-white/60">) {"{"}</span>
          </span>
        ),
      },
      {
        text: "    route, err := router.Resolve(path)",
        highlighted: (
          <span>
            {"    "}
            <span className="text-[#9cdcfe]">route</span>
            <span className="text-white/60">,</span>{" "}
            <span className="text-[#9cdcfe]">err</span>{" "}
            <span className="text-white/40">:=</span>{" "}
            <span className="text-[#9cdcfe]">router</span>
            <span className="text-white/60">.</span>
            <span className="text-[#dcdcaa]">Resolve</span>
            <span className="text-white/60">(</span>
            <span className="text-[#9cdcfe]">path</span>
            <span className="text-white/60">)</span>
          </span>
        ),
      },
      blank("go-b1"),
      {
        text: "    if err != nil || route == nil {",
        highlighted: (
          <span>
            {"    "}
            <span className="text-[#c586c0]">if</span>{" "}
            <span className="text-[#9cdcfe]">err</span>{" "}
            <span className="text-white/40">!=</span>{" "}
            <span className="text-[#569cd6]">nil</span>{" "}
            <span className="text-white/40">||</span>{" "}
            <span className="text-[#9cdcfe]">route</span>{" "}
            <span className="text-white/40">==</span>{" "}
            <span className="text-[#569cd6]">nil</span>{" "}
            <span className="text-white/60">{"{"}</span>
          </span>
        ),
      },
      {
        text: "        // Oops... nothing lives here",
        highlighted: (
          <span>
            {"        "}
            <span className="text-[#6a9955] italic">{"// Oops... nothing lives here"}</span>
          </span>
        ),
      },
      {
        text: "        return &Response{",
        highlighted: (
          <span>
            {"        "}
            <span className="text-[#c586c0]">return</span>{" "}
            <span className="text-white/40">&amp;</span>
            <span className="text-[#4ec9b0]">Response</span>
            <span className="text-white/60">{"{"}</span>
          </span>
        ),
      },
      {
        text: "            Status:  404,",
        highlighted: (
          <span>
            {"            "}
            <span className="text-[#9cdcfe]">Status</span>
            <span className="text-white/40">:</span>{" "}
            <span className="text-[#b5cea8]">404</span>
            <span className="text-white/60">,</span>
          </span>
        ),
      },
      {
        text: '            Message: "Page not found",',
        highlighted: (
          <span>
            {"            "}
            <span className="text-[#9cdcfe]">Message</span>
            <span className="text-white/40">:</span>{" "}
            <span className="text-[#ce9178]">&quot;Page not found&quot;</span>
            <span className="text-white/60">,</span>
          </span>
        ),
      },
      {
        text: "        }, nil",
        highlighted: (
          <span>
            {"        "}
            <span className="text-white/60">{"}"}</span>
            <span className="text-white/60">,</span>{" "}
            <span className="text-[#569cd6]">nil</span>
          </span>
        ),
      },
      {
        text: "    }",
        highlighted: <span>{"    "}<span className="text-white/60">{"}"}</span></span>,
      },
      blank("go-b2"),
      {
        text: "    return route.Render()",
        highlighted: (
          <span>
            {"    "}
            <span className="text-[#c586c0]">return</span>{" "}
            <span className="text-[#9cdcfe]">route</span>
            <span className="text-white/60">.</span>
            <span className="text-[#dcdcaa]">Render</span>
            <span className="text-white/60">()</span>
          </span>
        ),
      },
      { text: "}", highlighted: <span className="text-white/60">{"}"}</span> },
      blank("go-b3"),
      {
        text: "// → Navigating to current path...",
        highlighted: <span className="text-[#6a9955] italic">{"// → Navigating to current path..."}</span>,
      },
      {
        text: "Navigate(r.URL.Path)",
        highlighted: (
          <span>
            <span className="text-[#dcdcaa]">Navigate</span>
            <span className="text-white/60">(</span>
            <span className="text-[#9cdcfe]">r</span>
            <span className="text-white/60">.</span>
            <span className="text-[#9cdcfe]">URL</span>
            <span className="text-white/60">.</span>
            <span className="text-[#9cdcfe]">Path</span>
            <span className="text-white/60">)</span>
          </span>
        ),
      },
      blank("go-b4"),
      {
        text: "// ✗ Error 404: Page not found",
        highlighted: <span className="text-[#f44747]">{"// ✗ Error 404: Page not found"}</span>,
      },
    ],
  },

  // ── Rust ────────────────────────────────────────────────────────────────────
  rust: {
    label: "Rust",
    filename: "navigate.rs",
    badge: "RS",
    badgeColor: "text-[#ce9178]",
    lines: [
      {
        text: "async fn navigate(path: &str) -> Option<Response> {",
        highlighted: (
          <span>
            <span className="text-[#569cd6]">async fn</span>{" "}
            <span className="text-[#dcdcaa]">navigate</span>
            <span className="text-white/60">(</span>
            <span className="text-[#9cdcfe]">path</span>
            <span className="text-white/40">:</span>{" "}
            <span className="text-white/40">&amp;</span>
            <span className="text-[#4ec9b0]">str</span>
            <span className="text-white/60">)</span>{" "}
            <span className="text-white/40">-{">"}</span>{" "}
            <span className="text-[#4ec9b0]">Option</span>
            <span className="text-white/60">{"<"}</span>
            <span className="text-[#4ec9b0]">Response</span>
            <span className="text-white/60">{">"} {"{"}</span>
          </span>
        ),
      },
      {
        text: "    let route = router.resolve(path).await;",
        highlighted: (
          <span>
            {"    "}
            <span className="text-[#569cd6]">let</span>{" "}
            <span className="text-[#9cdcfe]">route</span>{" "}
            <span className="text-white/40">=</span>{" "}
            <span className="text-[#9cdcfe]">router</span>
            <span className="text-white/60">.</span>
            <span className="text-[#dcdcaa]">resolve</span>
            <span className="text-white/60">(</span>
            <span className="text-[#9cdcfe]">path</span>
            <span className="text-white/60">).</span>
            <span className="text-[#569cd6]">await</span>
            <span className="text-white/60">;</span>
          </span>
        ),
      },
      blank("rs-b1"),
      {
        text: "    if route.is_none() {",
        highlighted: (
          <span>
            {"    "}
            <span className="text-[#c586c0]">if</span>{" "}
            <span className="text-[#9cdcfe]">route</span>
            <span className="text-white/60">.</span>
            <span className="text-[#dcdcaa]">is_none</span>
            <span className="text-white/60">() {"{"}</span>
          </span>
        ),
      },
      {
        text: "        // Oops... nothing lives here",
        highlighted: (
          <span>
            {"        "}
            <span className="text-[#6a9955] italic">{"// Oops... nothing lives here"}</span>
          </span>
        ),
      },
      {
        text: "        return Some(Response {",
        highlighted: (
          <span>
            {"        "}
            <span className="text-[#c586c0]">return</span>{" "}
            <span className="text-[#4ec9b0]">Some</span>
            <span className="text-white/60">(</span>
            <span className="text-[#4ec9b0]">Response</span>{" "}
            <span className="text-white/60">{"{"}</span>
          </span>
        ),
      },
      {
        text: "            status: 404,",
        highlighted: (
          <span>
            {"            "}
            <span className="text-[#9cdcfe]">status</span>
            <span className="text-white/40">:</span>{" "}
            <span className="text-[#b5cea8]">404</span>
            <span className="text-white/60">,</span>
          </span>
        ),
      },
      {
        text: '            message: "Page not found",',
        highlighted: (
          <span>
            {"            "}
            <span className="text-[#9cdcfe]">message</span>
            <span className="text-white/40">:</span>{" "}
            <span className="text-[#ce9178]">&quot;Page not found&quot;</span>
            <span className="text-white/60">,</span>
          </span>
        ),
      },
      {
        text: "        });",
        highlighted: <span>{"        "}<span className="text-white/60">{"}"}</span><span className="text-white/60">);</span></span>,
      },
      {
        text: "    }",
        highlighted: <span>{"    "}<span className="text-white/60">{"}"}</span></span>,
      },
      blank("rs-b2"),
      {
        text: "    route.unwrap().render().await",
        highlighted: (
          <span>
            {"    "}
            <span className="text-[#9cdcfe]">route</span>
            <span className="text-white/60">.</span>
            <span className="text-[#dcdcaa]">unwrap</span>
            <span className="text-white/60">().</span>
            <span className="text-[#dcdcaa]">render</span>
            <span className="text-white/60">().</span>
            <span className="text-[#569cd6]">await</span>
          </span>
        ),
      },
      { text: "}", highlighted: <span className="text-white/60">{"}"}</span> },
      blank("rs-b3"),
      {
        text: "// → Navigating to current path...",
        highlighted: <span className="text-[#6a9955] italic">{"// → Navigating to current path..."}</span>,
      },
      {
        text: "navigate(&req.path).await;",
        highlighted: (
          <span>
            <span className="text-[#dcdcaa]">navigate</span>
            <span className="text-white/60">(</span>
            <span className="text-white/40">&amp;</span>
            <span className="text-[#9cdcfe]">req</span>
            <span className="text-white/60">.</span>
            <span className="text-[#9cdcfe]">path</span>
            <span className="text-white/60">).</span>
            <span className="text-[#569cd6]">await</span>
            <span className="text-white/60">;</span>
          </span>
        ),
      },
      blank("rs-b4"),
      {
        text: "// ✗ Error 404: Page not found",
        highlighted: <span className="text-[#f44747]">{"// ✗ Error 404: Page not found"}</span>,
      },
    ],
  },

  // ── C# ──────────────────────────────────────────────────────────────────────
  csharp: {
    label: "C#",
    filename: "Navigate.cs",
    badge: "C#",
    badgeColor: "text-[#c586c0]",
    lines: [
      {
        text: "public async Task<IResult> Navigate(string path)",
        highlighted: (
          <span>
            <span className="text-[#569cd6]">public async</span>{" "}
            <span className="text-[#4ec9b0]">Task</span>
            <span className="text-white/60">{"<"}</span>
            <span className="text-[#4ec9b0]">IResult</span>
            <span className="text-white/60">{">"}</span>{" "}
            <span className="text-[#dcdcaa]">Navigate</span>
            <span className="text-white/60">(</span>
            <span className="text-[#4ec9b0]">string</span>{" "}
            <span className="text-[#9cdcfe]">path</span>
            <span className="text-white/60">)</span>
          </span>
        ),
      },
      { text: "{", highlighted: <span className="text-white/60">{"{"}</span> },
      {
        text: "    var route = await Router.ResolveAsync(path);",
        highlighted: (
          <span>
            {"    "}
            <span className="text-[#569cd6]">var</span>{" "}
            <span className="text-[#9cdcfe]">route</span>{" "}
            <span className="text-white/40">=</span>{" "}
            <span className="text-[#569cd6]">await</span>{" "}
            <span className="text-[#9cdcfe]">Router</span>
            <span className="text-white/60">.</span>
            <span className="text-[#dcdcaa]">ResolveAsync</span>
            <span className="text-white/60">(</span>
            <span className="text-[#9cdcfe]">path</span>
            <span className="text-white/60">);</span>
          </span>
        ),
      },
      blank("cs-b1"),
      {
        text: "    if (route is null) {",
        highlighted: (
          <span>
            {"    "}
            <span className="text-[#c586c0]">if</span>{" "}
            <span className="text-white/60">(</span>
            <span className="text-[#9cdcfe]">route</span>{" "}
            <span className="text-[#c586c0]">is</span>{" "}
            <span className="text-[#569cd6]">null</span>
            <span className="text-white/60">) {"{"}</span>
          </span>
        ),
      },
      {
        text: "        // Oops... nothing lives here",
        highlighted: (
          <span>
            {"        "}
            <span className="text-[#6a9955] italic">{"// Oops... nothing lives here"}</span>
          </span>
        ),
      },
      {
        text: "        return Results.Json(new {",
        highlighted: (
          <span>
            {"        "}
            <span className="text-[#c586c0]">return</span>{" "}
            <span className="text-[#4ec9b0]">Results</span>
            <span className="text-white/60">.</span>
            <span className="text-[#dcdcaa]">Json</span>
            <span className="text-white/60">(</span>
            <span className="text-[#569cd6]">new</span>{" "}
            <span className="text-white/60">{"{"}</span>
          </span>
        ),
      },
      {
        text: "            Status = 404,",
        highlighted: (
          <span>
            {"            "}
            <span className="text-[#9cdcfe]">Status</span>{" "}
            <span className="text-white/40">=</span>{" "}
            <span className="text-[#b5cea8]">404</span>
            <span className="text-white/60">,</span>
          </span>
        ),
      },
      {
        text: '            Message = "Page not found"',
        highlighted: (
          <span>
            {"            "}
            <span className="text-[#9cdcfe]">Message</span>{" "}
            <span className="text-white/40">=</span>{" "}
            <span className="text-[#ce9178]">&quot;Page not found&quot;</span>
          </span>
        ),
      },
      {
        text: "        });",
        highlighted: <span>{"        "}<span className="text-white/60">{"}"}</span><span className="text-white/60">);</span></span>,
      },
      {
        text: "    }",
        highlighted: <span>{"    "}<span className="text-white/60">{"}"}</span></span>,
      },
      blank("cs-b2"),
      {
        text: "    return await route.RenderAsync();",
        highlighted: (
          <span>
            {"    "}
            <span className="text-[#c586c0]">return</span>{" "}
            <span className="text-[#569cd6]">await</span>{" "}
            <span className="text-[#9cdcfe]">route</span>
            <span className="text-white/60">.</span>
            <span className="text-[#dcdcaa]">RenderAsync</span>
            <span className="text-white/60">();</span>
          </span>
        ),
      },
      { text: "}", highlighted: <span className="text-white/60">{"}"}</span> },
      blank("cs-b3"),
      {
        text: "// → Navigating to current path...",
        highlighted: <span className="text-[#6a9955] italic">{"// → Navigating to current path..."}</span>,
      },
      {
        text: "await Navigate(ctx.Request.Path);",
        highlighted: (
          <span>
            <span className="text-[#569cd6]">await</span>{" "}
            <span className="text-[#dcdcaa]">Navigate</span>
            <span className="text-white/60">(</span>
            <span className="text-[#9cdcfe]">ctx</span>
            <span className="text-white/60">.</span>
            <span className="text-[#9cdcfe]">Request</span>
            <span className="text-white/60">.</span>
            <span className="text-[#9cdcfe]">Path</span>
            <span className="text-white/60">);</span>
          </span>
        ),
      },
      blank("cs-b4"),
      {
        text: "// ✗ Error 404: Page not found",
        highlighted: <span className="text-[#f44747]">{"// ✗ Error 404: Page not found"}</span>,
      },
    ],
  },
};

// ─── Timing ───────────────────────────────────────────────────────────────────

const CHAR_DELAY = 36;
const BLANK_DELAY = 80;

// ─── Component ────────────────────────────────────────────────────────────────

const LANG_OPTIONS: { id: LangId; label: string }[] = [
  { id: "typescript", label: "TypeScript" },
  { id: "python",     label: "Python"     },
  { id: "go",         label: "Go"         },
  { id: "rust",       label: "Rust"       },
  { id: "csharp",     label: "C#"         },
];

export function NotFoundEditor() {
  const [lang, setLang] = useState<LangId>("typescript");
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [done, setDone] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const config = LANGUAGES[lang];
  const lines = config.lines;

  // Reset animation whenever language changes
  useEffect(() => {
    const t = setTimeout(() => {
      setLineIdx(0);
      setCharIdx(0);
      setDone(false);
    }, 0);
    return () => clearTimeout(t);
  }, [lang]);

  // Typing engine
  useEffect(() => {
    if (done) return;

    const line = lines[lineIdx];
    if (!line) {
      const t = setTimeout(() => setDone(true), 0);
      return () => clearTimeout(t);
    }

    if (line.text === "") {
      const t = setTimeout(() => {
        if (lineIdx + 1 < lines.length) {
          setLineIdx((l) => l + 1);
          setCharIdx(0);
        } else {
          setDone(true);
        }
      }, BLANK_DELAY);
      return () => clearTimeout(t);
    }

    if (charIdx < line.text.length) {
      const t = setTimeout(() => setCharIdx((c) => c + 1), CHAR_DELAY);
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => {
      if (lineIdx + 1 < lines.length) {
        setLineIdx((l) => l + 1);
        setCharIdx(0);
      } else {
        setDone(true);
      }
    }, CHAR_DELAY);
    return () => clearTimeout(t);
  }, [lineIdx, charIdx, done, lines]);

  return (
    <div
      className="glass-card overflow-hidden shadow-2xl shadow-purple-500/10"
      style={{ width: "580px", maxWidth: "100%" }}
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="size-3 rounded-full bg-[#E3073C]/70" />
          <span className="size-3 rounded-full bg-[#FFD200]/70" />
          <span className="size-3 rounded-full bg-[#06E07F]/70" />
        </div>
        <span className="ml-2 text-xs text-white/30">{config.filename}</span>

        {/* Language dropdown */}
        <div className="relative ml-auto" ref={dropdownRef}>
          {/* Trigger button */}
          <button
            type="button"
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex cursor-pointer items-center gap-1.5 rounded-full border border-[#7c5aed]/40 bg-[#7c5aed]/10 py-0.5 pl-3 pr-2 text-[11px] text-[#a78bfa] transition-colors hover:border-[#7c5aed]/70 hover:bg-[#7c5aed]/20 hover:text-[#c4b5fd]"
          >
            {LANG_OPTIONS.find((o) => o.id === lang)?.label}
            <ChevronDownIcon
              className={`size-3 transition-transform duration-150 ${dropdownOpen ? "rotate-180" : ""}`}
            />
          </button>

          {/* Options panel */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full z-50 mt-1.5 w-36 overflow-hidden rounded-xl border border-[#7c5aed]/30 bg-[#1a1730] shadow-lg shadow-purple-900/30 backdrop-blur-md">
              {LANG_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    setLang(o.id as LangId);
                    setDropdownOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] transition-colors ${
                    lang === o.id
                      ? "bg-[#7c5aed]/20 text-[#c4b5fd]"
                      : "text-white/60 hover:bg-[#7c5aed]/10 hover:text-[#a78bfa]"
                  }`}
                >
                  {lang === o.id && (
                    <span className="size-1.5 shrink-0 rounded-full bg-[#7c5aed]" />
                  )}
                  {lang !== o.id && <span className="size-1.5 shrink-0" />}
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="ml-3 text-[10px] text-[#f44747]/70">Error 404</span>
      </div>

      {/* Tab */}
      <div className="flex items-center border-b border-white/10 px-2">
        <div className="flex items-center gap-1.5 border-b-2 border-[#7c5aed] px-3 py-1.5 text-[11px] text-white/70">
          <span className={`text-[9px] ${config.badgeColor}`}>{config.badge}</span>
          {config.filename}
          <span className="ml-1 text-white/25">×</span>
        </div>
      </div>

      {/* Code — fixed height so the card never resizes while typing */}
      <div
        className="overflow-hidden p-4 font-mono text-[12px] leading-[1.8] sm:text-[13px]"
        style={{ height: "456px" }}
      >
        {lines.map((line, i) => {
          if (i > lineIdx) return null;

          const lineNumber = (
            <span className="mr-4 inline-block w-5 shrink-0 select-none text-right text-[11px] text-white/15">
              {i + 1}
            </span>
          );

          if (i < lineIdx) {
            return (
              <div key={i} className="flex whitespace-pre">
                {lineNumber}
                {line.highlighted}
              </div>
            );
          }

          const typed = line.text.slice(0, charIdx);
          return (
            <div key={i} className="flex whitespace-pre">
              {lineNumber}
              <span className="text-white/75">{typed}</span>
              {!done && <span className="typing-cursor" />}
            </div>
          );
        })}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between border-t border-white/10 bg-white/[0.02] px-4 py-1 text-[10px]">
        <div className="flex items-center gap-3 text-white/30">
          <span>{config.label}</span>
          <span>UTF-8</span>
        </div>
        <span className={done ? "text-[#f44747]/80" : "text-white/25"}>
          {done ? "✗  404 Not Found" : "Running..."}
        </span>
      </div>
    </div>
  );
}
