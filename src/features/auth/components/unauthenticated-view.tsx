"use client";

import { useEffect, useState } from "react";
import {
  SparklesIcon,
  MonitorIcon,
  GithubIcon,
  ArrowRightIcon,
  MessageSquareIcon,
  CodeIcon,
  PlayIcon,
  UsersIcon,
  ZapIcon,
  MousePointerClickIcon,
  PanelLeftIcon,
  SearchIcon,
  TerminalIcon,
  WandSparklesIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Poppins } from "next/font/google";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// ─── Navbar ──────────────────────────────────────────────────────────

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-background/70 backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <Image src="/logo.svg" alt="Aura" width={24} height={24} />
          <span
            className={cn("text-base font-semibold text-white", poppins.className)}
          >
            Aura
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-white/70 hover:text-white" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/sign-up">Get Started</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}

// ─── Mock IDE (full layout with typing effect) ─────────────────────

const CODE_LINES: React.ReactNode[] = [
  <span key="c0">
    <span className="text-orange-300">#root</span>{" "}
    <span className="text-white/60">{"{"}</span>
  </span>,
  <span key="c1">
    {"  "}
    <span className="text-cyan-300">max-width</span>
    <span className="text-white/40">:</span>{" "}
    <span className="text-[#CE9178]">1280px</span>;
  </span>,
  <span key="c2">
    {"  "}
    <span className="text-cyan-300">margin</span>
    <span className="text-white/40">:</span>{" "}
    <span className="text-[#CE9178]">0 auto</span>;
  </span>,
  <span key="c3">
    {"  "}
    <span className="text-cyan-300">padding</span>
    <span className="text-white/40">:</span>{" "}
    <span className="text-[#CE9178]">2rem</span>;
  </span>,
  <span key="c4">
    {"  "}
    <span className="text-cyan-300">text-align</span>
    <span className="text-white/40">:</span>{" "}
    <span className="text-[#CE9178]">center</span>;
  </span>,
  <span key="c5">
    <span className="text-white/60">{"}"}</span>
  </span>,
  <span key="c6">&nbsp;</span>,
  <span key="c7">
    <span className="text-orange-300">.logo</span>{" "}
    <span className="text-white/60">{"{"}</span>
  </span>,
  <span key="c8">
    {"  "}
    <span className="text-cyan-300">height</span>
    <span className="text-white/40">:</span>{" "}
    <span className="text-[#CE9178]">6em</span>;
  </span>,
  <span key="c9">
    {"  "}
    <span className="text-cyan-300">padding</span>
    <span className="text-white/40">:</span>{" "}
    <span className="text-[#CE9178]">1.5em</span>;
  </span>,
  <span key="c10">
    {"  "}
    <span className="text-cyan-300">will-change</span>
    <span className="text-white/40">:</span>{" "}
    <span className="text-[#CE9178]">filter</span>;
  </span>,
  <span key="c11">
    {"  "}
    <span className="text-cyan-300">transition</span>
    <span className="text-white/40">:</span>{" "}
    <span className="text-[#CE9178]">filter 300ms</span>;
  </span>,
  <span key="c12">
    <span className="text-white/60">{"}"}</span>
  </span>,
  <span key="c13">&nbsp;</span>,
  <span key="c14">
    <span className="text-orange-300">.logo</span>
    <span className="text-yellow-300">:hover</span>{" "}
    <span className="text-white/60">{"{"}</span>
  </span>,
  <span key="c15">
    {"  "}
    <span className="text-cyan-300">filter</span>
    <span className="text-white/40">:</span>{" "}
    <span className="text-[#CE9178]">drop-shadow(0 0 2em #646cffaa)</span>;
  </span>,
  <span key="c16">
    <span className="text-white/60">{"}"}</span>
  </span>,
];

const CHAT_MESSAGES = [
  { from: "user" as const, text: "Hello Aura, create a modern To-Do App" },
  {
    from: "aura" as const,
    text: "I'll create a Vite + React app with a live clock, task list, and motivational quotes...",
  },
  {
    from: "aura" as const,
    text: "Created 6 files: App.tsx, App.css, index.css, main.tsx, index.html, vite.config.ts",
  },
];

const MODAL_PROMPT =
  "Hello Aura, please create a modern and clean To-Do App using Vite, React, and TypeScript. The app should have a responsive design that works well on both mobile and desktop, and it should allow users to add, edit, delete, and mark tasks as completed.";

const TERMINAL_LINES = [
  "$ npm run dev",
  "",
  "> my-app@0.0.0 dev",
  "> vite",
  "",
  "  VITE v5.4.1  ready in 320ms",
  "",
  "  ➜  Local:   http://localhost:5173/",
  "  ➜  Network: http://192.168.1.4:5173/",
];

const FILE_TREE = [
  { name: "public", indent: 0, icon: "📁" },
  { name: "src", indent: 0, icon: "📂", open: true },
  { name: "assets", indent: 1, icon: "📁" },
  { name: "App.css", indent: 1, icon: "{}", active: true },
  { name: "App.tsx", indent: 1, icon: "⚛" },
  { name: "index.css", indent: 1, icon: "{}" },
  { name: "main.tsx", indent: 1, icon: "⚛" },
  { name: ".gitignore", indent: 0, icon: "◆" },
  { name: "eslint.config.js", indent: 0, icon: "⚙" },
  { name: "index.html", indent: 0, icon: "</>" },
  { name: "package-lock.json", indent: 0, icon: "◉" },
  { name: "package.json", indent: 0, icon: "◉" },
  { name: "README.md", indent: 0, icon: "M" },
  { name: "tsconfig.app.json", indent: 0, icon: "T" },
  { name: "tsconfig.json", indent: 0, icon: "T" },
  { name: "tsconfig.node.json", indent: 0, icon: "T" },
  { name: "vite.config.ts", indent: 0, icon: "⚡" },
];

const LINE_DELAY = 140;
const TYPING_STEPS =
  CODE_LINES.length +
  CHAT_MESSAGES.length +
  TERMINAL_LINES.length +
  FILE_TREE.length;
const PREVIEW_WAIT = 8; // extra steps before switching to preview
const TOTAL_STEPS = TYPING_STEPS + PREVIEW_WAIT;
const HOLD_PAUSE = 12000;
const FADE_MS = 500;

// ─── Mock Preview (rendered app) ────────────────────────────────────

// Interactive to-do preview animation sequence
const TODO_ACTIONS = [
  { type: "idle", duration: 1500 },
  { type: "typing", text: "Deploy to production", duration: 1800 },
  { type: "add", duration: 800 },
  { type: "idle", duration: 1200 },
  { type: "complete", index: 1, duration: 800 },   // complete "Buy groceries"
  { type: "idle", duration: 1000 },
  { type: "delete", index: 2, duration: 600 },      // delete "Call the dentist"
  { type: "idle", duration: 1500 },
] as const;

type TodoItem = { id: number; text: string; completed: boolean; deleting?: boolean };
let nextTodoId = 100;

function MockPreview({ onActionChange }: { onActionChange?: (type: string) => void }) {
  const initialTasks: TodoItem[] = [
    { id: 1, text: "Finish React project", completed: false },
    { id: 2, text: "Buy groceries", completed: false },
    { id: 3, text: "Call the dentist", completed: false },
  ];
  const initialCompleted: TodoItem[] = [
    { id: 4, text: "Read a book", completed: true },
    { id: 5, text: "Walk the dog", completed: true },
  ];

  const [pending, setPending] = useState<TodoItem[]>(initialTasks);
  const [completed, setCompleted] = useState<TodoItem[]>(initialCompleted);
  const [inputText, setInputText] = useState("");
  const [inputHighlight, setInputHighlight] = useState(false);
  const [actionIndex, setActionIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);

  const action = TODO_ACTIONS[actionIndex % TODO_ACTIONS.length];

  // Report action type to parent
  useEffect(() => {
    onActionChange?.(action.type);
  }, [action.type, onActionChange]);

  // Action sequencer
  useEffect(() => {
    if (action.type === "typing") {
      if (charIndex < action.text.length) {
        const timer = setTimeout(() => {
          setInputText(action.text.slice(0, charIndex + 1));
          setCharIndex((c) => c + 1);
        }, action.duration / action.text.length);
        return () => clearTimeout(timer);
      }
      // Done typing, move to next action
      const timer = setTimeout(() => {
        setCharIndex(0);
        setActionIndex((i) => i + 1);
      }, 400);
      return () => clearTimeout(timer);
    }

    if (action.type === "add") {
      // Flash the input, then add task
      setInputHighlight(true);
      const timer = setTimeout(() => {
        setPending((prev) => [...prev, { id: nextTodoId++, text: inputText, completed: false }]);
        setInputText("");
        setInputHighlight(false);
        setActionIndex((i) => i + 1);
      }, action.duration);
      return () => clearTimeout(timer);
    }

    if (action.type === "complete") {
      const timer = setTimeout(() => {
        setPending((prev) => {
          const idx = Math.min(action.index, prev.length - 1);
          if (idx < 0) return prev;
          const task = prev[idx];
          setCompleted((c) => [{ ...task, id: nextTodoId++, completed: true }, ...c]);
          return prev.filter((_, i) => i !== idx);
        });
        setActionIndex((i) => i + 1);
      }, action.duration);
      return () => clearTimeout(timer);
    }

    if (action.type === "delete") {
      // Mark as deleting first, then remove
      setPending((prev) => {
        const idx = Math.min(action.index, prev.length - 1);
        if (idx < 0) return prev;
        return prev.map((t, i) => (i === idx ? { ...t, deleting: true } : t));
      });
      const timer = setTimeout(() => {
        setPending((prev) => prev.filter((t) => !t.deleting));
        setActionIndex((i) => i + 1);
      }, action.duration);
      return () => clearTimeout(timer);
    }

    if (action.type === "idle") {
      const timer = setTimeout(() => {
        // If we've looped, reset state
        if (actionIndex >= TODO_ACTIONS.length - 1) {
          setPending(initialTasks);
          setCompleted(initialCompleted);
          setInputText("");
          setActionIndex(0);
        } else {
          setActionIndex((i) => i + 1);
        }
      }, action.duration);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionIndex, charIndex]);

  return (
    <div className="flex flex-1 flex-col">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-1.5">
        <div className="flex items-center gap-2 text-white/25">
          <span className="text-[10px]">←</span>
          <span className="text-[10px]">→</span>
          <span className="text-[10px]">↻</span>
        </div>
        <div className="flex-1 rounded-full bg-white/5 px-3 py-0.5 text-center font-mono text-[10px] text-white/30">
          localhost:5173
        </div>
        <span className="text-[10px] text-white/20">↗</span>
      </div>

      {/* App content */}
      <div className="flex-1 overflow-auto bg-gradient-to-b from-[#1a1d2e] to-[#141625] p-4 sm:p-6">
        <div className="mx-auto max-w-[340px]">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-white/90 sm:text-[17px]">My To-Do List</h2>
            <div className="rounded-md bg-[#3b82f6] px-2.5 py-1 text-[10px] font-medium text-white">
              + Add Task
            </div>
          </div>

          {/* Input */}
          <div className="mb-4 flex gap-2">
            <div
              className={cn(
                "flex flex-1 items-center rounded-md border px-3 py-1.5 text-[11px] transition-all duration-300",
                inputHighlight
                  ? "border-[#3b82f6]/50 bg-[#3b82f6]/10"
                  : "border-white/10 bg-white/5",
                inputText ? "text-white/70" : "text-white/30",
              )}
            >
              {inputText || "What needs to be done?"}
              {action.type === "typing" && <span className="typing-cursor ml-0" />}
            </div>
            <div
              className={cn(
                "rounded-md px-3 py-1.5 text-[11px] font-semibold text-white transition-all duration-300",
                inputHighlight ? "bg-[#3b82f6] shadow-lg shadow-[#3b82f6]/30" : "bg-[#3b82f6]",
              )}
            >
              Add
            </div>
          </div>

          {/* Pending Tasks */}
          <div className="mb-1.5 text-[11px] font-semibold text-white/50">Pending Tasks</div>
          <div className="mb-4 space-y-1.5">
            {pending.map((task) => (
              <div
                key={`p-${task.id}`}
                className={cn(
                  "flex items-center justify-between rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 transition-all duration-300",
                  task.deleting && "scale-95 opacity-0 border-[#ef4444]/30 bg-[#ef4444]/10",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full border border-white/20 text-[8px]" />
                  <span className="text-[11px] text-white/70">{task.text}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-[#3b82f6]">✎</span>
                  <span className="text-[10px] text-[#ef4444]">🗑</span>
                </div>
              </div>
            ))}
          </div>

          {/* Completed */}
          <div className="mb-1.5 text-[11px] font-semibold italic text-white/35">Completed</div>
          <div className="mb-3 space-y-1.5">
            {completed.map((task) => (
              <div
                key={`c-${task.id}`}
                className="flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 transition-all duration-300"
              >
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[#22c55e] text-[8px] text-white">
                  ✓
                </span>
                <span className="text-[11px] text-white/30 line-through">{task.text}</span>
              </div>
            ))}
          </div>

          {/* Clear Completed */}
          <div className="flex justify-end">
            <div className="rounded-md bg-[#3b82f6] px-2.5 py-1 text-[10px] font-medium text-white">
              Clear Completed
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Animated Cursor ────────────────────────────────────────────────

function MockCursor({ x, y, clicking }: { x: number; y: number; clicking: boolean }) {
  return (
    <div
      className="pointer-events-none absolute z-50 transition-all duration-500 ease-in-out"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      {/* Cursor SVG */}
      <svg
        width="16"
        height="20"
        viewBox="0 0 16 20"
        fill="none"
        className={cn(
          "drop-shadow-lg transition-transform duration-150",
          clicking && "scale-90",
        )}
      >
        <path
          d="M0.5 0.5L0.5 16.5L4.5 12.5L8 19.5L10.5 18.5L7 11.5L12.5 11.5L0.5 0.5Z"
          fill="#1F84EF"
          stroke="white"
          strokeWidth="1"
        />
      </svg>
      {/* Click ripple */}
      {clicking && (
        <div className="absolute left-0 top-0 size-6 -translate-x-1/4 -translate-y-1/4 animate-ping rounded-full bg-white/20" />
      )}
    </div>
  );
}

// Cursor positions for each dashboard phase (% based)
const DASHBOARD_CURSOR: Record<string, { x: number; y: number; click?: boolean }> = {
  "dashboard":         { x: 35, y: 45 },         // Resting on dashboard
  "highlight-new":     { x: 22, y: 38 },         // On "New" button
  "modal-typing":      { x: 45, y: 52 },         // In the modal textarea
  "modal-submit":      { x: 62, y: 62 },         // On submit button
  "project-appear":    { x: 45, y: 55 },         // Waiting for project
  "highlight-project": { x: 50, y: 55, click: true }, // Clicking To-do-app
  "transition":        { x: 50, y: 50 },
};

// Cursor positions for todo preview actions (% based within the preview area)
const TODO_CURSOR: Record<string, { x: number; y: number; click?: boolean }> = {
  "idle":     { x: 75, y: 40 },
  "typing":   { x: 65, y: 33 },         // In the input field
  "add":      { x: 82, y: 33, click: true },  // On "Add" button
  "complete": { x: 55, y: 52, click: true },  // On a task checkbox
  "delete":   { x: 83, y: 55, click: true },  // On delete icon
};

// ─── Mock Dashboard Content ─────────────────────────────────────────

function MockDashboardContent({
  showModal,
  modalText,
  showProject,
  highlightProject,
  highlightNew,
}: {
  showModal: boolean;
  modalText: string;
  showProject: boolean;
  highlightProject: boolean;
  highlightNew: boolean;
}) {
  return (
    <div className="relative flex flex-1 items-start justify-center overflow-hidden p-6 sm:p-10">
      <div className="w-full max-w-[400px]">
        {/* Logo + title */}
        <div className="mb-6 flex items-center gap-2.5">
          <Image src="/logo.svg" alt="Aura" width={28} height={28} />
          <span className={cn("text-2xl font-bold text-white", poppins.className)}>Aura</span>
        </div>

        {/* New / Import buttons */}
        <div className="mb-5 grid grid-cols-2 gap-3">
          <div
            className={cn(
              "rounded-lg border p-3 transition-all duration-300",
              highlightNew
                ? "border-[#1F84EF]/50 bg-[#1F84EF]/10"
                : "border-white/10 bg-white/[0.03]",
            )}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[13px] text-white/40">✦</span>
              <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[9px] text-white/25">⌘J</span>
            </div>
            <span className="text-[13px] font-medium text-white/80">New</span>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[13px] text-white/40">⑂</span>
              <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[9px] text-white/25">⌘I</span>
            </div>
            <span className="text-[13px] font-medium text-white/80">Import</span>
          </div>
        </div>

        {/* Modal overlay */}
        {showModal && (
          <div className="mb-5 rounded-lg border border-white/10 bg-white/[0.06] p-4 shadow-xl shadow-black/20 backdrop-blur-sm">
            <div className="min-h-[80px] text-[12px] leading-relaxed text-white/70">
              {modalText}
              <span className="typing-cursor" />
            </div>
            <div className="mt-3 flex items-center justify-end gap-3">
              <span className="text-[11px] text-white/30">+ Blank project</span>
              <div className="flex size-7 items-center justify-center rounded-md bg-white/10 text-[11px] text-white/40">
                ↵
              </div>
            </div>
          </div>
        )}

        {/* Last updated */}
        {showProject && (
          <>
            <div className="mb-2 text-[11px] text-white/30">Last updated</div>
            <div
              className={cn(
                "mb-5 flex items-center justify-between rounded-lg border p-3 transition-all duration-500",
                highlightProject
                  ? "border-[#1F84EF]/50 bg-[#1F84EF]/10 shadow-lg shadow-[#1F84EF]/10"
                  : "border-white/10 bg-white/[0.03]",
              )}
            >
              <div>
                <div className="flex items-center gap-2 text-[13px] font-medium text-white/80">
                  <span className="text-[11px] text-white/30">🌐</span>
                  To-do-app
                </div>
                <div className="mt-0.5 text-[11px] text-white/30">in less than a minute</div>
              </div>
              <span className={cn("text-[13px] transition-colors", highlightProject ? "text-[#1F84EF]" : "text-white/20")}>→</span>
            </div>
          </>
        )}

        {/* Recent projects */}
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] text-white/30">Recent projects</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/25">View all</span>
            <span className="rounded bg-white/10 px-1 py-0.5 font-mono text-[8px] text-white/20">⌘K</span>
          </div>
        </div>
        <div className="space-y-0.5">
          {[
            { name: "smart-env", icon: "⑂", time: "4 days ago" },
            { name: "weather-dashboard", icon: "🌐", time: "12 days ago" },
            { name: "portfolio-site", icon: "🌐", time: "12 days ago" },
          ].map((p) => (
            <div key={p.name} className="flex items-center justify-between rounded-md px-1 py-1.5 text-[11px]">
              <div className="flex items-center gap-2 text-white/50">
                <span className="text-[10px] text-white/25">{p.icon}</span>
                {p.name}
              </div>
              <span className="text-white/20">{p.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Mock IDE ───────────────────────────────────────────────────────

// Animation phases & timing
type Phase =
  | "dashboard"       // Show dashboard
  | "highlight-new"   // Highlight "New" button
  | "modal-typing"    // Modal appears, prompt types in
  | "modal-submit"    // Brief flash before submitting
  | "project-appear"  // To-do-app appears in "Last updated"
  | "highlight-project" // Highlight the project row
  | "transition"      // Fade to editor
  | "editor";         // Full editor typing animation

const PHASE_TIMING: Record<Exclude<Phase, "modal-typing" | "editor">, number> = {
  "dashboard": 1500,
  "highlight-new": 800,
  "modal-submit": 600,
  "project-appear": 1200,
  "highlight-project": 1000,
  "transition": 400,
};

const MODAL_CHAR_DELAY = 18; // ms per character for typing
const TRANSITION_MS = 400;

function MockIDE() {
  const [phase, setPhase] = useState<Phase>("dashboard");
  const [modalCharIndex, setModalCharIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [todoActionType, setTodoActionType] = useState("idle");
  const [fading, setFading] = useState(false);

  // Phase progression (non-typing, non-editor phases)
  useEffect(() => {
    if (phase === "modal-typing" || phase === "editor") return;

    const nextPhase: Record<string, Phase> = {
      "dashboard": "highlight-new",
      "highlight-new": "modal-typing",
      "modal-submit": "project-appear",
      "project-appear": "highlight-project",
      "highlight-project": "transition",
      "transition": "editor",
    };

    const next = nextPhase[phase];
    if (!next) return;

    const delay = PHASE_TIMING[phase as keyof typeof PHASE_TIMING];
    const timer = setTimeout(() => {
      if (next === "editor") setStep(0);
      if (next === "modal-typing") setModalCharIndex(0);
      setPhase(next);
    }, delay);
    return () => clearTimeout(timer);
  }, [phase]);

  // Modal typing animation
  useEffect(() => {
    if (phase !== "modal-typing") return;
    if (modalCharIndex >= MODAL_PROMPT.length) {
      const timer = setTimeout(() => setPhase("modal-submit"), 500);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setModalCharIndex((c) => c + 1), MODAL_CHAR_DELAY);
    return () => clearTimeout(timer);
  }, [phase, modalCharIndex]);

  // Editor typing animation
  const fileCount = Math.min(step, FILE_TREE.length);
  const chatCount = Math.min(Math.max(step - 2, 0), CHAT_MESSAGES.length);
  const codeCount = Math.min(Math.max(step - 4, 0), CODE_LINES.length);
  const termCount = Math.min(
    Math.max(step - 4 - CODE_LINES.length, 0),
    TERMINAL_LINES.length,
  );
  const showPreview = phase === "editor" && step >= TOTAL_STEPS;

  useEffect(() => {
    if (phase !== "editor" || fading) return;

    if (step < TOTAL_STEPS) {
      const timer = setTimeout(() => setStep((s) => s + 1), LINE_DELAY);
      return () => clearTimeout(timer);
    }

    // Hold preview, then fade & restart
    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(() => {
        setPhase("dashboard");
        setStep(0);
        setModalCharIndex(0);
        setFading(false);
      }, FADE_MS);
    }, HOLD_PAUSE);
    return () => clearTimeout(timer);
  }, [phase, step, fading]);

  const isDashboardPhase = phase !== "editor";

  // Compute cursor position
  const cursorPos = (() => {
    if (isDashboardPhase) {
      return DASHBOARD_CURSOR[phase] || { x: 50, y: 50 };
    }
    // Editor phase: show cursor only during preview
    if (showPreview) {
      return TODO_CURSOR[todoActionType] || { x: 75, y: 40 };
    }
    // During code typing, hide cursor (return off-screen)
    return { x: -10, y: -10 };
  })();

  const isCursorClicking =
    (isDashboardPhase && (phase === "highlight-new" || phase === "highlight-project" || phase === "modal-submit")) ||
    (showPreview && (TODO_CURSOR[todoActionType]?.click ?? false));

  const showCursor = !(cursorPos.x < 0) && !fading;

  return (
    <div
      className={cn(
        "glass-card overflow-hidden shadow-2xl shadow-purple-500/10 transition-opacity",
        fading ? "opacity-0" : "opacity-100",
      )}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      {/* ── Title bar ─────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2 sm:px-4">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-[#E3073C]/70 sm:size-3" />
          <span className="size-2.5 rounded-full bg-[#FFD200]/70 sm:size-3" />
          <span className="size-2.5 rounded-full bg-[#06E07F]/70 sm:size-3" />
        </div>
        <Image src="/logo.svg" alt="Aura" width={16} height={16} className="ml-2" />
        <span className="text-xs font-medium text-white/50">Aura</span>
        {!isDashboardPhase && (
          <>
            <span className="text-white/20">&gt;</span>
            <span className="text-xs text-white/40">To-do-app</span>
            <span className="text-[10px] text-white/20">↻</span>
          </>
        )}

        {!isDashboardPhase && (
          <div className="ml-auto flex items-center gap-3">
            <div className="flex gap-1 text-[10px] sm:text-xs">
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 transition-colors",
                  !showPreview
                    ? "bg-white/10 font-medium text-white/80"
                    : "text-white/30",
                )}
              >
                Code
              </span>
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 transition-colors",
                  showPreview
                    ? "bg-white/10 font-medium text-white/80"
                    : "text-white/30",
                )}
              >
                Preview
              </span>
            </div>
            <span className="hidden text-[10px] text-white/30 sm:inline">Share</span>
          </div>
        )}
      </div>

      {/* ── Main body ─────────────────────────────────── */}
      <div className="relative flex overflow-hidden" style={{ height: "480px" }}>
        {/* Animated cursor */}
        {showCursor && (
          <MockCursor x={cursorPos.x} y={cursorPos.y} clicking={isCursorClicking} />
        )}
        {isDashboardPhase ? (
          <div
            className={cn(
              "flex flex-1 transition-opacity",
              phase === "transition" ? "opacity-0" : "opacity-100",
            )}
            style={{ transitionDuration: `${TRANSITION_MS}ms` }}
          >
            <div className="hidden w-full flex-col md:flex">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Image src="/logo.svg" alt="Aura" width={18} height={18} />
                  <span className={cn("text-sm font-semibold text-white/80", poppins.className)}>Aura</span>
                </div>
                <div className="size-6 rounded-full bg-white/10" />
              </div>
              <MockDashboardContent
                showModal={phase === "modal-typing" || phase === "modal-submit"}
                modalText={MODAL_PROMPT.slice(0, modalCharIndex)}
                showProject={phase === "project-appear" || phase === "highlight-project"}
                highlightProject={phase === "highlight-project"}
                highlightNew={phase === "highlight-new"}
              />
            </div>
            <div className="flex flex-1 md:hidden">
              <MockDashboardContent
                showModal={phase === "modal-typing" || phase === "modal-submit"}
                modalText={MODAL_PROMPT.slice(0, modalCharIndex)}
                showProject={phase === "project-appear" || phase === "highlight-project"}
                highlightProject={phase === "highlight-project"}
                highlightNew={phase === "highlight-new"}
              />
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "flex flex-1 transition-opacity",
              phase === "editor" ? "opacity-100" : "opacity-0",
            )}
            style={{ transitionDuration: `${TRANSITION_MS}ms` }}
          >
            {/* ── Activity bar ──────────────────────────── */}
            <div className="hidden w-[36px] shrink-0 flex-col items-center gap-3 border-r border-white/10 py-3 md:flex">
              <span className="text-[13px] text-white/30">📋</span>
              <span className="text-[13px] text-white/30">🔍</span>
              <span className="text-[13px] text-white/30">🧩</span>
              <div className="mt-auto">
                <span className="text-[13px] text-white/30">⚙</span>
              </div>
            </div>

            {/* ── Chat panel ────────────────────────────── */}
            <div className="hidden w-[200px] shrink-0 flex-col border-r border-white/10 md:flex">
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                <span className="text-[10px] font-medium text-white/40">New conversation</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-white/20">⟳</span>
                  <span className="text-[10px] text-white/20">+</span>
                </div>
              </div>
              <div className="flex-1 space-y-2.5 overflow-hidden p-3 text-[11px] leading-relaxed">
                {CHAT_MESSAGES.slice(0, chatCount).map((msg, i) => (
                  <div key={i}>
                    {msg.from === "user" ? (
                      <div className="ml-2 rounded-lg rounded-br-none bg-white/10 px-2.5 py-1.5 text-white/70">
                        {msg.text}
                      </div>
                    ) : (
                      <div className="flex items-start gap-1.5">
                        <span className="mt-0.5 text-[10px]">✦</span>
                        <span className="text-white/50">{msg.text}</span>
                      </div>
                    )}
                  </div>
                ))}
                {showPreview && (
                  <div className="flex items-start gap-1.5">
                    <span className="mt-0.5 text-[10px]">✦</span>
                    <span className="text-[#06E07F]/70">
                      Your app is running at localhost:5173
                    </span>
                  </div>
                )}
                {chatCount > 0 && chatCount < CHAT_MESSAGES.length && (
                  <span className="typing-cursor" />
                )}
              </div>
              <div className="border-t border-white/10 px-3 py-2">
                <div className="flex items-center rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5">
                  <span className="text-[10px] text-white/25">Ask Aura anything...</span>
                  <span className="ml-auto text-[10px] text-white/15">↵</span>
                </div>
              </div>
            </div>

            {/* ── File tree ─────────────────────────────── */}
            <div className="hidden w-[160px] shrink-0 flex-col border-r border-white/10 lg:flex">
              <div className="border-b border-white/10">
                <div className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-white/30">
                  Open Editors
                </div>
                <div className="px-2 pb-1.5">
                  <div className="flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] text-white/60">
                    <span className="text-[9px] leading-none">{"{}"}</span>
                    <span className="truncate">App.css</span>
                    <span className="ml-auto text-[9px] text-white/20">×</span>
                  </div>
                </div>
              </div>
              <div className="border-b border-white/10 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-white/30">
                TO-DO-APP
              </div>
              <div className="flex-1 space-y-0.5 overflow-hidden p-2 text-[11px]">
                {FILE_TREE.slice(0, fileCount).map((f, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-1.5 rounded px-1.5 py-0.5",
                      f.active
                        ? "bg-[#1F84EF]/15 text-white/80"
                        : "text-white/40",
                    )}
                    style={{ paddingLeft: `${f.indent * 12 + 6}px` }}
                  >
                    <span className="text-[9px] leading-none">{f.icon}</span>
                    <span className="truncate">{f.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Editor + Terminal OR Preview ──────────── */}
            {showPreview ? (
              <MockPreview onActionChange={setTodoActionType} />
            ) : (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="flex items-center gap-2 border-b border-white/10 px-3 py-1.5">
                  <div className="flex flex-1 items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1">
                    <span className="text-[10px] text-white/20">🔍</span>
                    <span className="text-[10px] text-white/25">Search files...</span>
                  </div>
                  <span className="hidden text-[10px] text-white/30 sm:inline">Export</span>
                </div>
                <div className="flex items-center border-b border-white/10 px-3">
                  <div className="flex items-center gap-1.5 border-b-2 border-[#1F84EF] px-2 py-1.5 text-[11px] text-white/70">
                    <span className="text-[9px]">{"{}"}</span>
                    App.css
                    <span className="ml-1 text-white/20">×</span>
                  </div>
                </div>
                <div className="border-b border-white/10 px-3 py-1 text-[10px] text-white/25">
                  src &gt; <span className="text-white/40">{"{}"} App.css</span>
                </div>
                <div className="flex-1 overflow-hidden p-3 font-mono text-[11px] leading-[1.7] sm:text-[12px]">
                  {CODE_LINES.slice(0, codeCount).map((line, i) => (
                    <div key={i} className="flex">
                      <span className="mr-3 inline-block w-5 text-right text-white/15 select-none">
                        {i + 1}
                      </span>
                      <span className="text-white/50">{line}</span>
                    </div>
                  ))}
                  {codeCount > 0 && codeCount < CODE_LINES.length && (
                    <span className="typing-cursor" />
                  )}
                </div>
                <div className="border-t border-white/10">
                  <div className="flex items-center gap-2 border-b border-white/10 px-3 py-1 text-[10px]">
                    <span className="text-white/40">Terminal</span>
                    <span className="ml-auto text-white/20">bash</span>
                  </div>
                  <div
                    className="overflow-hidden p-3 font-mono text-[10px] leading-relaxed text-white/40 sm:text-[11px]"
                    style={{ minHeight: "90px" }}
                  >
                    {TERMINAL_LINES.slice(0, termCount).map((line, i) => (
                      <div key={i}>
                        {line === "" ? (
                          <span>&nbsp;</span>
                        ) : line.startsWith("  ➜") ? (
                          <span>
                            {"  "}
                            <span className="text-[#06E07F]">➜</span>
                            {line.slice(3)}
                          </span>
                        ) : line.startsWith("  VITE") ? (
                          <span>
                            {"  "}
                            <span className="text-[#FFD200]">VITE</span>
                            {line.slice(6)}
                          </span>
                        ) : (
                          line
                        )}
                      </div>
                    ))}
                    {termCount > 0 && termCount < TERMINAL_LINES.length && (
                      <span className="typing-cursor" />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Features Section ────────────────────────────────────────────────

const featuresHero = [
  {
    icon: SparklesIcon,
    title: "AI Code Assistant",
    description:
      "Chat with AI to write, edit, and debug your code. Get intelligent suggestions, explanations, and refactoring — all through natural conversation.",
    gradient: "from-purple-500 to-violet-600",
    span: true,
  },
  {
    icon: MonitorIcon,
    title: "In-Browser Preview",
    description:
      "See your app running live with WebContainer. No local setup, no deployment — instant preview as you code.",
    gradient: "from-[#1F84EF] to-cyan-500",
    span: true,
  },
] as const;

const featuresGrid = [
  {
    icon: WandSparklesIcon,
    title: "Inline AI Autocomplete",
    description:
      "Ghost text completions as you type, powered by AI. Accept suggestions with a single keystroke.",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: MousePointerClickIcon,
    title: "Multi-Cursor Editing",
    description:
      "Select and edit multiple locations simultaneously for fast, precise refactoring.",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    icon: PanelLeftIcon,
    title: "Split Pane Editor",
    description:
      "Open files side-by-side for comparison, reference, or working across components.",
    gradient: "from-rose-500 to-orange-500",
  },
  {
    icon: SearchIcon,
    title: "Find & Replace Across Files",
    description:
      "Project-wide search with regex support. Rename symbols and refactor across your entire codebase.",
    gradient: "from-orange-500 to-amber-500",
  },
  {
    icon: TerminalIcon,
    title: "Multiple Terminals",
    description:
      "Run several processes simultaneously with multiple terminal tabs and a dedicated console panel.",
    gradient: "from-amber-500 to-yellow-500",
  },
  {
    icon: UsersIcon,
    title: "Real-Time Collaboration",
    description:
      "Multiple users can edit the same project simultaneously with live cursors and presence indicators.",
    gradient: "from-[#1F84EF] to-blue-600",
  },
  {
    icon: GithubIcon,
    title: "GitHub Import & Export",
    description:
      "Import existing repos directly into Aura or push your projects back to GitHub in a single click.",
    gradient: "from-cyan-500 to-emerald-500",
  },
  {
    icon: ZapIcon,
    title: "Multi-Model AI",
    description:
      "Choose from multiple AI models — Claude, GPT, Gemini, and more — to power your coding workflow.",
    gradient: "from-emerald-500 to-green-500",
  },
] as const;

function FeaturesSection() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
      <div className="animate-fade-in-up text-center" style={{ animationDelay: "0.4s" }}>
        <h2
          className={cn(
            "text-3xl font-semibold text-white sm:text-4xl",
            poppins.className,
          )}
        >
          Everything you need to code
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-white/50">
          A full-featured code editor with AI assistance, live preview, and
          real-time collaboration — all in your browser.
        </p>
      </div>

      {/* Hero features (2 large cards) */}
      <div className="mt-14 grid gap-5 sm:grid-cols-2">
        {featuresHero.map((feature, i) => (
          <div
            key={feature.title}
            className="glass-card animate-fade-in-up relative overflow-hidden p-6 sm:p-8"
            style={{ animationDelay: `${0.5 + i * 0.1}s` }}
          >
            {/* Background glow */}
            <div
              className={cn(
                "absolute -right-10 -top-10 size-32 rounded-full bg-gradient-to-br opacity-[0.07] blur-2xl",
                feature.gradient,
              )}
            />
            <div
              className={cn(
                "relative inline-flex size-11 items-center justify-center rounded-xl bg-gradient-to-br",
                feature.gradient,
              )}
            >
              <feature.icon className="size-5 text-white" />
            </div>
            <h3 className="relative mt-4 text-lg font-semibold text-white">
              {feature.title}
            </h3>
            <p className="relative mt-2 text-sm leading-relaxed text-white/50">
              {feature.description}
            </p>
          </div>
        ))}
      </div>

      {/* Feature grid (smaller cards) */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {featuresGrid.map((feature, i) => (
          <div
            key={feature.title}
            className="animate-fade-in-up group rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-colors hover:border-white/[0.1] hover:bg-white/[0.04]"
            style={{ animationDelay: `${0.7 + i * 0.06}s` }}
          >
            <div
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-lg bg-gradient-to-br",
                feature.gradient,
              )}
            >
              <feature.icon className="size-4 text-white" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-white/90">
              {feature.title}
            </h3>
            <p className="mt-1.5 text-[12px] leading-relaxed text-white/40">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── How It Works Section ────────────────────────────────────────────

const steps = [
  {
    number: "1",
    icon: MessageSquareIcon,
    title: "Describe what you want",
    description:
      "Tell the AI what to build in plain English. Aura's agent powered by Claude understands your intent and writes production-ready code across multiple files.",
    gradient: "from-purple-500 to-violet-600",
    visual: (
      <div className="mt-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-left">
        <div className="mb-2 flex items-center gap-1.5">
          <div className="size-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600" />
          <span className="text-[10px] text-white/40">You</span>
        </div>
        <p className="text-[11px] leading-relaxed text-white/50">
          &ldquo;Create a todo app with a live clock, dark theme, and motivational quotes&rdquo;
        </p>
        <div className="mt-2.5 flex items-center gap-1.5">
          <span className="text-[10px] text-purple-400">✦</span>
          <span className="text-[10px] text-white/30">Creating 6 files...</span>
        </div>
      </div>
    ),
  },
  {
    number: "2",
    icon: CodeIcon,
    title: "Edit with AI + full editor",
    description:
      "Use inline AI autocomplete, multi-cursor editing, quick edits, and code explanations. The full-featured CodeMirror editor gives you the power of a desktop IDE.",
    gradient: "from-[#1F84EF] to-cyan-500",
    visual: (
      <div className="mt-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 font-mono text-[10px]">
        <div className="flex gap-2">
          <span className="text-white/15">1</span>
          <span><span className="text-purple-400">const</span> [<span className="text-cyan-300">tasks</span>, <span className="text-cyan-300">setTasks</span>] = <span className="text-yellow-300">useState</span>([]);</span>
        </div>
        <div className="flex gap-2">
          <span className="text-white/15">2</span>
          <span className="text-white/20 italic">// AI: adding filter logic...</span>
        </div>
        <div className="mt-1.5 inline-block rounded bg-purple-500/10 px-1.5 py-0.5 text-[9px] text-purple-400">
          ✦ AI Autocomplete
        </div>
      </div>
    ),
  },
  {
    number: "3",
    icon: PlayIcon,
    title: "Preview instantly in-browser",
    description:
      "Your app runs live inside the browser using WebContainer — no terminal, no local setup. See changes reflected in real-time as you code.",
    gradient: "from-[#06E07F] to-emerald-600",
    visual: (
      <div className="mt-4 rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-3 py-1.5">
          <span className="size-1.5 rounded-full bg-[#E3073C]/50" />
          <span className="size-1.5 rounded-full bg-[#FFD200]/50" />
          <span className="size-1.5 rounded-full bg-[#06E07F]/50" />
          <span className="ml-1 flex-1 text-center text-[9px] text-white/20">localhost:5173</span>
        </div>
        <div className="p-3 text-center">
          <div className="font-mono text-sm font-bold tracking-wider text-white/60">12:34:56 PM</div>
          <div className="mt-1 text-[9px] text-white/20">Live preview running</div>
          <div className="mx-auto mt-2 flex max-w-[120px] items-center gap-1 rounded bg-white/5 px-2 py-1 text-[9px] text-white/30">
            <span className="size-2 rounded-sm border border-[#06E07F]/60 bg-[#06E07F]/15 text-[6px] leading-[8px] text-center text-[#06E07F]">✓</span>
            Build a cool app
          </div>
        </div>
      </div>
    ),
  },
] as const;

function HowItWorksSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
      <div className="animate-fade-in-up text-center" style={{ animationDelay: "0.6s" }}>
        <h2
          className={cn(
            "text-3xl font-semibold text-white sm:text-4xl",
            poppins.className,
          )}
        >
          How it works
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-white/50">
          Go from idea to running app in three steps — no setup, no configuration.
        </p>
      </div>

      {/* Steps */}
      <div className="mt-14 grid gap-6 sm:grid-cols-3">
        {steps.map((step, i) => (
          <div
            key={step.number}
            className="glass-card animate-fade-in-up relative overflow-hidden p-6"
            style={{ animationDelay: `${0.7 + i * 0.1}s` }}
          >
            {/* Step number badge */}
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white",
                  step.gradient,
                )}
              >
                {step.number}
              </div>
              <step.icon className="size-4 text-white/30" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-white">
              {step.title}
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-white/45">
              {step.description}
            </p>
            {/* Mini visual */}
            {step.visual}
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Final CTA Section ──────────────────────────────────────────────

function CTASection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
      <div
        className="animate-fade-in-up glass-card relative overflow-hidden px-6 py-14 text-center sm:px-12 sm:py-20"
        style={{ animationDelay: "0.8s" }}
      >
        {/* Background glow */}
        <div className="glow-orb -top-20 -right-20 size-60 bg-[#1F84EF]" />
        <div className="glow-orb -bottom-20 -left-20 size-60 bg-purple-600" />

        <h2
          className={cn(
            "relative text-3xl font-semibold text-white sm:text-4xl",
            poppins.className,
          )}
        >
          Ready to build with AI?
        </h2>
        <p className="relative mx-auto mt-3 max-w-md text-white/50">
          Start coding in seconds. No setup, no configuration — just ideas
          brought to life.
        </p>
        <Button size="lg" className="relative mt-8" asChild>
          <Link href="/sign-up">
            Get Started Free
            <ArrowRightIcon className="ml-2 size-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

// ─── Footer ─────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-white/10 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 sm:flex-row sm:justify-between sm:px-6">
        <div className="flex items-center gap-2">
          <Image src="/logo.svg" alt="Aura" width={16} height={16} />
          <span className="text-sm text-white/40">
            Built with Aura
          </span>
        </div>
        <span className="text-sm text-white/30">
          &copy; {new Date().getFullYear()} Aura. All rights reserved.
        </span>
      </div>
    </footer>
  );
}

// ─── Landing Page ───────────────────────────────────────────────────

export const UnauthenticatedView = () => {
  return (
    <div className="landing-gradient min-h-screen text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-28 pb-16 sm:pt-36 sm:pb-24">
        {/* Glow orbs */}
        <div className="glow-orb left-1/4 top-20 size-72 bg-purple-600" />
        <div
          className="glow-orb right-1/4 top-40 size-60 bg-[#1F84EF]"
          style={{ animationDelay: "2s" }}
        />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="animate-fade-in-up text-center">
            <Badge variant="secondary" className="mb-5 bg-white/10 text-white/80 hover:bg-white/10">
              AI-Powered Code Editor
            </Badge>
            <h1
              className={cn(
                "text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl",
                poppins.className,
              )}
            >
              Build. Edit. Preview.
              <br />
              <span className="bg-gradient-to-r from-[#FFD200] via-[#1F84EF] to-[#06E07F] bg-clip-text text-transparent">
                All with AI.
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-white/50">
              Aura is an AI-powered code editor with in-browser runtime. Write
              code through conversation, see it run instantly — no setup
              required.
            </p>

            <div className="mt-8 flex items-center justify-center gap-3">
              <Button size="lg" asChild>
                <Link href="/sign-up">
                  Get Started
                  <ArrowRightIcon className="ml-2 size-4" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="text-white/60 hover:text-white"
                asChild
              >
                <a href="#features">Learn More</a>
              </Button>
            </div>
          </div>

          {/* Mock IDE visual */}
          <div
            className="animate-fade-in-up mx-auto mt-14 max-w-5xl"
            style={{ animationDelay: "0.25s" }}
          >
            <MockIDE />
          </div>
        </div>
      </section>

      <Separator className="mx-auto max-w-6xl bg-white/5" />

      <FeaturesSection />

      <Separator className="mx-auto max-w-6xl bg-white/5" />

      <HowItWorksSection />

      <CTASection />

      <Footer />
    </div>
  );
};
