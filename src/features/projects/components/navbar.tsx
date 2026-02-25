"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { CloudCheckIcon, LoaderIcon, LockIcon, GlobeIcon } from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";
import { Poppins } from "next/font/google";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { Id } from "../../../../convex/_generated/dataModel";
import { useProject, useRenameProject, useSetProjectVisibility } from "../hooks/use-projects";
import { OnlineUsers } from "@/features/editor/components/online-users";

const font = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const Navbar = ({ projectId }: { projectId: Id<"projects"> }) => {
  const project = useProject(projectId);
  const renameProject = useRenameProject();
  const { user } = useUser();
  const setVisibility = useSetProjectVisibility();

  const [isRenaming, setIsRenaming] = useState(false);
  const [name, setName] = useState("");
  const [visibilityDialogOpen, setVisibilityDialogOpen] = useState(false);

  const isOwner = !!project && !!user && project.ownerId === user.id;
  const isPublic = project?.isPublic ?? false;
  const isDemoProject = project?.isDemo === true || project?.isDemoTemplate === true;

  const handleStartRename = () => {
    if (!project) return;
    setName(project.name);
    setIsRenaming(true);
  };

  const handleSubmit = () => {
    if (!project) return;
    setIsRenaming(false);

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName === project.name) return;

    renameProject({ id: projectId, name: trimmedName });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    } else if (e.key === "Escape") {
      setIsRenaming(false);
    }
  };

  return (
    <nav className="flex justify-between items-center gap-x-2 p-2 bg-sidebar border-b">
      <div className="flex items-center gap-x-2">
        <Breadcrumb>
          <BreadcrumbList className="gap-0!">
            <BreadcrumbItem>
              <BreadcrumbLink className="flex items-center gap-1.5" asChild>
                <Button variant="ghost" className="w-fit! p-1.5! h-7!" asChild>
                  <Link href="/">
                    <Image src="/logo.svg" alt="Logo" width={20} height={20} />
                    <span className={cn("text-sm font-medium", font.className)}>
                      Aura
                    </span>
                  </Link>
                </Button>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="ml-0! mr-1" />
            {!isOwner && (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Button variant="ghost" className="w-fit! p-1.5! h-7!" asChild>
                      <Link href="/communities">
                        <span className="text-sm font-medium">Communities</span>
                      </Link>
                    </Button>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="ml-0! mr-1" />
              </>
            )}
            <BreadcrumbItem>
              {isOwner && isRenaming ? (
                <input
                  autoFocus
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onFocus={(e) => e.currentTarget.select()}
                  onBlur={handleSubmit}
                  onKeyDown={handleKeyDown}
                  className="text-sm bg-transparent text-foreground outline-none focus:ring-1 focus:ring-inset focus:ring-ring font-medium max-w-40 truncate"
                />
              ) : (
                <BreadcrumbPage
                  onClick={isOwner ? handleStartRename : undefined}
                  className={cn(
                    "text-sm font-medium max-w-40 truncate",
                    isOwner && "cursor-pointer hover:text-primary",
                  )}
                >
                  {project?.name ?? "Loading..."}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        {project?.importStatus === "importing" ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <LoaderIcon className="size-4 text-muted-foreground animate-spin" />
            </TooltipTrigger>
            <TooltipContent>Importing...</TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <CloudCheckIcon className="size-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              Saved{" "}
              {project?.updatedAt
                ? formatDistanceToNow(project.updatedAt, { addSuffix: true })
                : "Loading..."}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="flex items-center gap-2">
        {isOwner && !isDemoProject && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
                onClick={() => setVisibilityDialogOpen(true)}
              >
                {isPublic ? (
                  <GlobeIcon className="size-3.5 text-green-500" />
                ) : (
                  <LockIcon className="size-3.5" />
                )}
                {isPublic ? "Public" : "Private"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isPublic
                ? "Project is public — click to make private"
                : "Project is private — click to make public"}
            </TooltipContent>
          </Tooltip>
        )}
        <OnlineUsers projectId={projectId} />
        <UserButton />
      </div>
      <AlertDialog
        open={visibilityDialogOpen}
        onOpenChange={setVisibilityDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isPublic ? "Make Project Private?" : "Make Project Public?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isPublic
                ? "This project will be hidden from the Communities page and only accessible to you and collaborators."
                : "This project will appear on the Communities page and be discoverable by anyone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await setVisibility({ id: projectId, isPublic: !isPublic });
                  toast.success(
                    !isPublic
                      ? "Project is now public"
                      : "Project is now private",
                  );
                } catch {
                  toast.error("Failed to update project visibility");
                }
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </nav>
  );
};
