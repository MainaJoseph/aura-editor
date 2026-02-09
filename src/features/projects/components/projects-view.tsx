"use client";

import Image from "next/image";
import Link from "next/link";
import { Poppins } from "next/font/google";
import { SparkleIcon } from "lucide-react";
import { FaGithub } from "react-icons/fa";
import { useEffect, useState } from "react";
import { UserButton } from "@clerk/nextjs";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";

import { ProjectsList } from "./projects-list";
import { ProjectsCommandDialog } from "./projects-command-dialog";
import { ImportGithubDialog } from "./import-github-dialog";
import { NewProjectDialog } from "./new-project-dialog";

const font = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const ProjectsView = () => {
  const [commandDialogOpen, setCommandDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [newProjectDialogOpen, setNewProjectDialogOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === "k") {
          e.preventDefault();
          setCommandDialogOpen(true);
        }
        if (e.key === "i") {
          e.preventDefault();
          setImportDialogOpen(true);
        }
        if (e.key === "j") {
          e.preventDefault();
          setNewProjectDialogOpen(true);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <ProjectsCommandDialog
        open={commandDialogOpen}
        onOpenChange={setCommandDialogOpen}
      />
      <ImportGithubDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />
      <NewProjectDialog
        open={newProjectDialogOpen}
        onOpenChange={setNewProjectDialogOpen}
      />
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-sidebar">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.svg" alt="Aura" width={22} height={22} />
            <span className={cn("text-sm font-semibold", font.className)}>
              Aura
            </span>
          </Link>
          <UserButton />
        </div>
      </nav>

      <div className="min-h-screen bg-sidebar flex flex-col items-center justify-center p-6 pt-20 md:p-16 md:pt-20">
        <div className="w-full max-w-sm mx-auto flex flex-col gap-4 items-center">
          <div className="flex justify-between gap-4 w-full items-center">
            <div className="flex items-center gap-2 w-full group/logo">
              <Image
                src="/logo.svg"
                alt="Aura"
                width={46}
                height={46}
                className="size-[32px] md:size-[46px]"
              />
              <h1
                className={cn(
                  "text-4xl md:text-5xl font-semibold",
                  font.className,
                )}
              >
                Aura
              </h1>
            </div>
          </div>

          <div className="flex flex-col gap-4 w-full">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => setNewProjectDialogOpen(true)}
                className="h-full items-start justify-start p-4 bg-background border flex flex-col gap-6 rounded-none"
              >
                <div className="flex items-center justify-between w-full">
                  <SparkleIcon className="size-4" />
                  <Kbd className="bg-accent border">⌘J</Kbd>
                </div>
                <div>
                  <span className="text-sm">New</span>
                </div>
              </Button>
              <Button
                variant="outline"
                onClick={() => setImportDialogOpen(true)}
                className="h-full items-start justify-start p-4 bg-background border flex flex-col gap-6 rounded-none"
              >
                <div className="flex items-center justify-between w-full">
                  <FaGithub className="size-4" />
                  <Kbd className="bg-accent border">⌘I</Kbd>
                </div>
                <div>
                  <span className="text-sm">Import</span>
                </div>
              </Button>
            </div>

            <ProjectsList onViewAll={() => setCommandDialogOpen(true)} />
          </div>
        </div>
      </div>
    </>
  );
};
