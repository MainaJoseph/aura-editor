import Link from "next/link";
import Image from "next/image";
import { Poppins } from "next/font/google";
import { HomeIcon, ArrowRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NotFoundEditor } from "./not-found-editor";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function NotFound() {
  return (
    <div className="landing-gradient relative flex min-h-screen flex-col overflow-hidden text-white">
      {/* Glow orbs */}
      <div className="glow-orb left-1/4 top-1/4 size-80 bg-purple-600" />
      <div
        className="glow-orb right-1/4 bottom-1/4 size-64 bg-[#1F84EF]"
        style={{ animationDelay: "3s" }}
      />
      <div
        className="glow-orb left-1/2 top-1/2 size-48 bg-violet-500"
        style={{ animationDelay: "1.5s" }}
      />

      {/* Subtle grid overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Navbar */}
      <nav className="relative z-50 border-b border-white/10 bg-background/70 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.svg" alt="Aura" width={22} height={22} />
            <span className={cn("text-base font-semibold text-white", poppins.className)}>
              Aura
            </span>
          </Link>
        </div>
      </nav>

      {/* Main content — two column on lg */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-12 px-6 py-16 lg:flex-row lg:gap-16 lg:px-16 xl:px-24">

        {/* Left — text + CTAs */}
        <div className="animate-fade-in-up flex flex-col items-center text-center lg:items-start lg:text-left">
          {/* 404 number */}
          <div className="relative mb-4 select-none">
            <span
              className={cn(
                "text-[8rem] font-bold leading-none tracking-tighter sm:text-[11rem]",
                poppins.className,
              )}
              style={{
                background: "linear-gradient(135deg, #7c5aed 0%, #1F84EF 55%, #06E07F 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              404
            </span>
            {/* Glow copy */}
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 text-[8rem] font-bold leading-none tracking-tighter opacity-20 blur-2xl sm:text-[11rem]",
                poppins.className,
              )}
              style={{
                background: "linear-gradient(135deg, #7c5aed 0%, #1F84EF 55%, #06E07F 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              404
            </span>
          </div>

          <h1 className={cn("text-2xl font-semibold text-white sm:text-3xl", poppins.className)}>
            Page not found
          </h1>
          <p className="mt-3 max-w-sm text-base text-white/50">
            Looks like this page took an unplanned detour. It might have been
            moved, deleted, or never existed.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Button size="lg" asChild>
              <Link href="/">
                <HomeIcon className="mr-2 size-4" />
                Go home
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="text-white/60 hover:text-white"
              asChild
            >
              <Link href="/">
                Open a project
                <ArrowRightIcon className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Right — animated editor */}
        <div
          className="animate-fade-in-up w-full max-w-xl lg:max-w-none lg:flex-1"
          style={{ animationDelay: "0.15s" }}
        >
          <NotFoundEditor />
        </div>

      </div>
    </div>
  );
}
