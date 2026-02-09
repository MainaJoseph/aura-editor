"use client";

import { useEffect, useState } from "react";
import {
  SparklesIcon,
  MonitorIcon,
  GithubIcon,
  ArrowRightIcon,
} from "lucide-react";
import Image from "next/image";
import { Poppins } from "next/font/google";
import { SignInButton } from "@clerk/nextjs";

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
          <SignInButton>
            <Button variant="ghost" size="sm" className="text-white/70 hover:text-white">
              Sign in
            </Button>
          </SignInButton>
          <SignInButton>
            <Button size="sm">
              Get Started
            </Button>
          </SignInButton>
        </div>
      </div>
    </nav>
  );
}

// ─── Mock IDE (full layout with typing effect) ─────────────────────

const CODE_LINES: React.ReactNode[] = [
  <span key="c0">
    <span className="text-purple-400">import</span>{" "}
    <span className="text-cyan-300">{"{ useEffect, useState }"}</span>{" "}
    <span className="text-purple-400">from</span>{" "}
    <span className="text-emerald-400">&quot;react&quot;</span>;
  </span>,
  <span key="c1">
    <span className="text-purple-400">import</span>{" "}
    <span className="text-emerald-400">&quot;./App.css&quot;</span>;
  </span>,
  <span key="c2">&nbsp;</span>,
  <span key="c3">
    <span className="text-purple-400">function</span>{" "}
    <span className="text-yellow-300">App</span>
    <span className="text-white/60">() {"{"}</span>
  </span>,
  <span key="c4">
    {"  "}
    <span className="text-purple-400">const</span> [
    <span className="text-cyan-300">time</span>,{" "}
    <span className="text-cyan-300">setTime</span>] ={" "}
    <span className="text-yellow-300">useState</span>(
    <span className="text-purple-400">new</span>{" "}
    <span className="text-yellow-300">Date</span>());
  </span>,
  <span key="c5">
    {"  "}
    <span className="text-purple-400">const</span> [
    <span className="text-cyan-300">task</span>,{" "}
    <span className="text-cyan-300">setTask</span>] ={" "}
    <span className="text-yellow-300">useState</span>(
    <span className="text-emerald-400">&quot;&quot;</span>);
  </span>,
  <span key="c6">
    {"  "}
    <span className="text-purple-400">const</span> [
    <span className="text-cyan-300">tasks</span>,{" "}
    <span className="text-cyan-300">setTasks</span>] ={" "}
    <span className="text-yellow-300">useState</span>
    <span className="text-white/50">&lt;</span>
    <span className="text-cyan-300">string</span>[]
    <span className="text-white/50">&gt;</span>([]);
  </span>,
  <span key="c7">
    {"  "}
    <span className="text-purple-400">const</span>{" "}
    <span className="text-cyan-300">quotes</span> = [
  </span>,
  <span key="c8">
    {"    "}
    <span className="text-emerald-400">&quot;Stay consistent.&quot;</span>,
  </span>,
  <span key="c9">
    {"    "}
    <span className="text-emerald-400">&quot;Build every day.&quot;</span>,
  </span>,
  <span key="c10">
    {"    "}
    <span className="text-emerald-400">&quot;Small wins compound.&quot;</span>,
  </span>,
  <span key="c11">{"  "}];</span>,
];

const CHAT_MESSAGES = [
  { from: "user" as const, text: "Hello Aura Create a vite App" },
  { from: "aura" as const, text: "Thinking..." },
  {
    from: "aura" as const,
    text: "I'll create a Vite + React app with a live clock, task list, and motivational quotes...",
  },
  {
    from: "aura" as const,
    text: "Created 6 files: App.tsx, App.css, index.css, main.tsx, index.html, vite.config.ts",
  },
];

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
  { name: "src", indent: 0, icon: "📂" },
  { name: "App.css", indent: 1, icon: "{}" },
  { name: "App.tsx", indent: 1, icon: "⚛", active: true },
  { name: "index.css", indent: 1, icon: "{}" },
  { name: "main.tsx", indent: 1, icon: "⚛" },
  { name: ".gitignore", indent: 0, icon: "◆" },
  { name: "index.html", indent: 0, icon: "</>" },
  { name: "package.json", indent: 0, icon: "◉" },
  { name: "tsconfig.json", indent: 0, icon: "T" },
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
const HOLD_PAUSE = 5000;
const FADE_MS = 500;

// ─── Mock Preview (rendered app) ────────────────────────────────────

function MockPreview() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const formatted = time.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="flex flex-1 flex-col">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-1.5">
        <div className="flex items-center gap-1 text-white/20">
          <span className="text-[10px]">←</span>
          <span className="text-[10px]">→</span>
          <span className="text-[10px]">↻</span>
        </div>
        <div className="flex-1 rounded-md bg-white/5 px-3 py-0.5 text-center font-mono text-[10px] text-white/30">
          localhost:5173
        </div>
        <span className="text-[10px] text-white/20">↗</span>
      </div>

      {/* App content */}
      <div className="flex-1 overflow-hidden bg-gradient-to-br from-[#0f0f1a] to-[#1a1025] p-5 sm:p-6">
        {/* Clock */}
        <div className="mb-5 text-center">
          <div className="font-mono text-3xl font-bold tracking-wider text-white/90 sm:text-4xl">
            {formatted}
          </div>
          <div className="mt-1 text-[11px] text-white/30">Live Clock</div>
        </div>

        {/* Task list */}
        <div className="mx-auto max-w-[280px]">
          <h3 className="mb-2 text-[12px] font-semibold text-white/60">
            My Tasks
          </h3>
          <div className="mb-2 flex gap-1.5">
            <div className="flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/25">
              Add a new task...
            </div>
            <div className="rounded-md bg-[#1F84EF] px-2 py-1 text-[10px] font-medium text-white">
              Add
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 rounded-md bg-white/5 px-2 py-1.5 text-[11px] text-white/50">
              <span className="size-3 rounded border border-[#06E07F] bg-[#06E07F]/20 text-center text-[8px] leading-3 text-[#06E07F]">
                ✓
              </span>
              <span className="line-through">Build a cool app</span>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-white/5 px-2 py-1.5 text-[11px] text-white/50">
              <span className="size-3 rounded border border-white/20" />
              Learn React hooks
            </div>
          </div>
        </div>

        {/* Quote */}
        <div className="mt-5 text-center">
          <div className="text-[11px] italic text-white/25">
            &ldquo;Stay consistent.&rdquo;
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Mock IDE ───────────────────────────────────────────────────────

function MockIDE() {
  const [step, setStep] = useState(0);
  const [fading, setFading] = useState(false);

  // Distribute steps across panels
  const fileCount = Math.min(step, FILE_TREE.length);
  const chatCount = Math.min(Math.max(step - 2, 0), CHAT_MESSAGES.length);
  const codeCount = Math.min(Math.max(step - 4, 0), CODE_LINES.length);
  const termCount = Math.min(
    Math.max(step - 4 - CODE_LINES.length, 0),
    TERMINAL_LINES.length,
  );

  const showPreview = step >= TOTAL_STEPS;

  useEffect(() => {
    if (fading) return;

    // Still stepping through typing + preview-wait
    if (step < TOTAL_STEPS) {
      const timer = setTimeout(() => setStep((s) => s + 1), LINE_DELAY);
      return () => clearTimeout(timer);
    }

    // Show preview for HOLD_PAUSE, then fade & restart
    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(() => {
        setStep(0);
        setFading(false);
      }, FADE_MS);
    }, HOLD_PAUSE);
    return () => clearTimeout(timer);
  }, [step, fading]);

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
        <span className="text-white/20">&gt;</span>
        <span className="text-xs text-white/40">my-project</span>

        {/* Code / Preview tabs */}
        <div className="ml-auto flex gap-1 text-[10px] sm:text-xs">
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
      </div>

      {/* ── Main body (3 columns on md+) ─────────────── */}
      <div className="flex" style={{ minHeight: "380px" }}>
        {/* ── Left: Chat panel ──────────────────────── */}
        <div className="hidden w-[200px] shrink-0 flex-col border-r border-white/10 md:flex">
          {/* Chat header */}
          <div className="border-b border-white/10 px-3 py-2 text-[10px] font-medium text-white/40">
            New conversation
          </div>

          {/* Messages */}
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
            {/* Preview-phase message */}
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

          {/* Input */}
          <div className="border-t border-white/10 px-3 py-2">
            <div className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] text-white/25">
              Ask Aura anything...
            </div>
          </div>
        </div>

        {/* ── Middle: File tree ─────────────────────── */}
        <div className="hidden w-[150px] shrink-0 flex-col border-r border-white/10 lg:flex">
          <div className="border-b border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">
            MY-PROJECT
          </div>
          <div className="flex-1 space-y-0.5 overflow-hidden p-2 text-[11px]">
            {FILE_TREE.slice(0, fileCount).map((f, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-1.5 rounded px-1.5 py-0.5",
                  f.active
                    ? "bg-white/10 text-white/80"
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

        {/* ── Right: Editor + Terminal  OR  Preview ─── */}
        {showPreview ? (
          <MockPreview />
        ) : (
          <div className="flex flex-1 flex-col">
            {/* Tab bar */}
            <div className="flex items-center border-b border-white/10 px-3">
              <div className="flex items-center gap-1.5 border-b border-[#1F84EF] px-2 py-1.5 text-[11px] text-white/70">
                <span className="text-[9px]">⚛</span>
                App.tsx
                <span className="ml-1 text-white/20">×</span>
              </div>
            </div>

            {/* Breadcrumb */}
            <div className="border-b border-white/10 px-3 py-1 text-[10px] text-white/25">
              src &gt; <span className="text-white/40">App.tsx</span>
            </div>

            {/* Code area */}
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

            {/* Terminal */}
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
    </div>
  );
}

// ─── Features Section ────────────────────────────────────────────────

const features = [
  {
    icon: SparklesIcon,
    title: "AI Code Assistant",
    description:
      "Chat with Claude to write, edit, and debug your code. Get intelligent suggestions as you build.",
    gradient: "from-purple-500 to-blue-500",
  },
  {
    icon: MonitorIcon,
    title: "In-Browser Preview",
    description:
      "See your app running live with WebContainer. No local setup or deployment needed.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: GithubIcon,
    title: "GitHub Integration",
    description:
      "Import existing repos and export your projects back to GitHub in a single click.",
    gradient: "from-cyan-500 to-emerald-500",
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
        <p className="mx-auto mt-3 max-w-lg text-white/50">
          Aura combines AI assistance, a powerful editor, and live preview into
          one seamless workflow.
        </p>
      </div>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, i) => (
          <div
            key={feature.title}
            className="glass-card animate-fade-in-up p-6"
            style={{ animationDelay: `${0.5 + i * 0.1}s` }}
          >
            <div
              className={cn(
                "inline-flex size-10 items-center justify-center rounded-lg bg-gradient-to-br",
                feature.gradient,
              )}
            >
              <feature.icon className="size-5 text-white" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-white">
              {feature.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-white/50">
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
    title: "Create or import a project",
    description:
      "Start from scratch or import an existing repository from GitHub.",
  },
  {
    number: "2",
    title: "Chat with AI to write & edit code",
    description:
      "Describe what you want. The AI assistant writes, edits, and refactors for you.",
  },
  {
    number: "3",
    title: "Preview your app live",
    description:
      "See your changes running instantly in the browser — no terminal needed.",
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
        <p className="mx-auto mt-3 max-w-lg text-white/50">
          Go from idea to running app in three simple steps.
        </p>
      </div>

      <div className="mt-14 grid gap-8 sm:grid-cols-3">
        {steps.map((step, i) => (
          <div
            key={step.number}
            className="animate-fade-in-up text-center"
            style={{ animationDelay: `${0.7 + i * 0.1}s` }}
          >
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-[#1F84EF] to-[#06E07F] text-lg font-bold text-white">
              {step.number}
            </div>
            <h3 className="mt-4 text-lg font-semibold text-white">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-white/50">
              {step.description}
            </p>
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
        <SignInButton>
          <Button size="lg" className="relative mt-8">
            Get Started Free
            <ArrowRightIcon className="ml-2 size-4" />
          </Button>
        </SignInButton>
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
              <SignInButton>
                <Button size="lg">
                  Get Started
                  <ArrowRightIcon className="ml-2 size-4" />
                </Button>
              </SignInButton>
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
