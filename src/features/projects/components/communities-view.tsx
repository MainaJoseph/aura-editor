"use client";

import Image from "next/image";
import Link from "next/link";
import { Poppins } from "next/font/google";
import { SearchIcon, GlobeIcon, CameraIcon, Loader2Icon } from "lucide-react";
import { RiGitForkLine } from "react-icons/ri";
import { formatDistanceToNow } from "date-fns";
import { UserButton } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import {
  usePublicProjectsPaginated,
  useSearchPublicProjects,
  useGenerateBannerUploadUrl,
  useUpdateProjectBanner,
} from "../hooks/use-projects";
import { Id } from "../../../../convex/_generated/dataModel";

const font = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

type CommunityProject = {
  _id: Id<"projects">;
  _creationTime: number;
  name: string;
  updatedAt: number;
  ownerId: string;
  isForked: boolean;
  bannerUrl: string | null;
  forkCount: number;
};

const ProjectCardSkeleton = () => (
  <div className="rounded-xl border border-border bg-background overflow-hidden">
    <Skeleton className="h-40 w-full rounded-none" />
    <div className="p-4 flex flex-col gap-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  </div>
);

const ProjectCard = ({
  project,
  isOwner,
  isUploading,
  onUploadBanner,
}: {
  project: CommunityProject;
  isOwner: boolean;
  isUploading: boolean;
  onUploadBanner: (projectId: Id<"projects">) => void;
}) => {
  return (
    <div className="group rounded-xl border border-border bg-background overflow-hidden hover:border-primary/40 hover:shadow-md transition-all duration-200">
      {/* Banner */}
      <div className="relative h-40 bg-muted/40 overflow-hidden">
        {project.bannerUrl ? (
          <img
            src={project.bannerUrl}
            alt={project.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Image
              src="/logo.svg"
              alt="Aura"
              width={40}
              height={40}
              className="opacity-10"
            />
          </div>
        )}

        {/* Gradient overlay at bottom */}
        {project.bannerUrl && (
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/40 to-transparent" />
        )}

        {/* Owner upload overlay */}
        {isOwner && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onUploadBanner(project._id);
            }}
            disabled={isUploading}
            className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs cursor-pointer"
          >
            {isUploading ? (
              <Loader2Icon className="size-5 animate-spin" />
            ) : (
              <CameraIcon className="size-5" />
            )}
            <span>{isUploading ? "Uploading..." : "Change banner"}</span>
          </button>
        )}
      </div>

      {/* Content */}
      <Link
        href={`/projects/${project._id}`}
        className="p-4 flex flex-col gap-2 block hover:bg-accent/5 transition-colors"
      >
        <h3 className="font-medium text-sm truncate">{project.name}</h3>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            {project.forkCount > 0 && (
              <span className="flex items-center gap-1">
                <RiGitForkLine className="size-3" />
                {project.forkCount}
              </span>
            )}
            {project.isForked && (
              <span className="text-[10px] bg-yellow-500/10 border border-yellow-500/30 rounded-sm px-1.5 py-0.5 text-yellow-600 dark:text-yellow-400">
                Forked
              </span>
            )}
          </div>
          <span>{formatDistanceToNow(project.updatedAt, { addSuffix: true })}</span>
        </div>
      </Link>
    </div>
  );
};

export const CommunitiesView = () => {
  const { user, isSignedIn } = useUser();

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [uploadingProjectId, setUploadingProjectId] = useState<Id<"projects"> | null>(null);
  const [pendingUploadId, setPendingUploadId] = useState<Id<"projects"> | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const generateUploadUrl = useGenerateBannerUploadUrl();
  const updateBanner = useUpdateProjectBanner();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const isSearching = debouncedSearch.length > 0;

  // Paginated feed
  const { results, status, loadMore } = usePublicProjectsPaginated();

  // Search results
  const searchResults = useSearchPublicProjects(debouncedSearch);

  const displayProjects: CommunityProject[] = isSearching
    ? (searchResults ?? [])
    : results;

  const isLoadingFirstPage =
    isSearching ? searchResults === undefined : status === "LoadingFirstPage";

  // Infinite scroll sentinel
  useEffect(() => {
    if (isSearching) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && status === "CanLoadMore") {
          loadMore(12);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isSearching, status, loadMore]);

  // Banner upload
  const handleBannerClick = useCallback((projectId: Id<"projects">) => {
    setPendingUploadId(projectId);
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !pendingUploadId) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }

    const projectId = pendingUploadId;
    setPendingUploadId(null);

    try {
      setUploadingProjectId(projectId);
      const uploadUrl = await generateUploadUrl({});
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { storageId } = await res.json();
      await updateBanner({ projectId, storageId });
      toast.success("Banner updated");
    } catch {
      toast.error("Failed to upload banner");
    } finally {
      setUploadingProjectId(null);
    }
  };

  return (
    <div className="min-h-screen bg-sidebar">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
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
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-sm text-muted-foreground cursor-default"
              disabled
            >
              Docs
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-sm underline underline-offset-4"
              asChild
            >
              <Link href="/communities">Communities</Link>
            </Button>
            {isSignedIn && <UserButton />}
          </div>
        </div>
      </nav>

      <div className="pt-20 pb-16 px-4 sm:px-6 mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-10">
          <h1 className={cn("text-3xl font-semibold mb-2", font.className)}>
            Community
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            Discover and explore projects shared by the Aura community
          </p>

          {/* Search */}
          <div className="relative max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search projects..."
              className="pl-9 bg-background"
            />
          </div>
        </div>

        {/* Grid */}
        {isLoadingFirstPage ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProjectCardSkeleton key={i} />
            ))}
          </div>
        ) : displayProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3 text-muted-foreground">
            <GlobeIcon className="size-10 opacity-30" />
            <p className="text-sm font-medium">
              {isSearching ? `No results for "${debouncedSearch}"` : "No public projects yet"}
            </p>
            {!isSearching && (
              <p className="text-xs opacity-60">
                Be the first to share a project with the community
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayProjects.map((project) => (
                <ProjectCard
                  key={project._id}
                  project={project}
                  isOwner={!!user && project.ownerId === user.id}
                  isUploading={uploadingProjectId === project._id}
                  onUploadBanner={handleBannerClick}
                />
              ))}
            </div>

            {/* Infinite scroll sentinel + load more indicator */}
            {!isSearching && (
              <div ref={sentinelRef} className="mt-8 flex justify-center">
                {status === "LoadingMore" && (
                  <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
                )}
                {status === "Exhausted" && displayProjects.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    All projects loaded
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
