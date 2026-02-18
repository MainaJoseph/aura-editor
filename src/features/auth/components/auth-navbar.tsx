"use client";

import Link from "next/link";
import Image from "next/image";
import { Poppins } from "next/font/google";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const poppins = Poppins({ subsets: ["latin"], weight: ["600"] });

interface AuthNavbarProps {
  /** Which page we're on — controls which action button is shown */
  page: "sign-in" | "sign-up";
}

export function AuthNavbar({ page }: AuthNavbarProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-background/70 backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.svg" alt="Aura" width={22} height={22} />
          <span className={cn("text-base font-semibold text-white", poppins.className)}>
            Aura
          </span>
        </Link>

        {/* Contextual CTA */}
        {page === "sign-in" ? (
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-white/40 sm:inline">
              Don&apos;t have an account?
            </span>
            <Button size="sm" asChild>
              <Link href="/sign-up">Sign up</Link>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-white/40 sm:inline">
              Already have an account?
            </span>
            <Button variant="ghost" size="sm" className="text-white/70 hover:text-white" asChild>
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}
