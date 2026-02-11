"use client";

import { useState, useEffect } from "react";
import { CheckCircle2Icon, DownloadIcon, StarIcon, Loader2Icon } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDownloads } from "../constants";
import { ExtensionIcon } from "./extension-icon";
import { Doc } from "../../../../convex/_generated/dataModel";

interface ExtensionCardProps {
  extension: Doc<"extensions">;
  isInstalled: boolean;
  onInstall: () => Promise<void>;
  onClick: () => void;
}

type InstallState = "idle" | "installing" | "installed";

export const ExtensionCard = ({
  extension,
  isInstalled,
  onInstall,
  onClick,
}: ExtensionCardProps) => {
  const [installState, setInstallState] = useState<InstallState>("idle");

  // Reset state when isInstalled changes externally
  useEffect(() => {
    if (isInstalled) {
      setInstallState("idle");
    }
  }, [isInstalled]);

  const handleInstall = async () => {
    setInstallState("installing");
    try {
      await onInstall();
      // Show "Installed" for a moment before the isInstalled prop takes over
      setInstallState("installed");
      setTimeout(() => setInstallState("idle"), 2000);
    } catch {
      setInstallState("idle");
    }
  };

  return (
    <div
      role="button"
      onClick={onClick}
      className="flex items-start gap-2.5 px-2 py-2 hover:bg-accent/30 cursor-pointer group"
    >
      <ExtensionIcon name={extension.icon} category={extension.category} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium truncate">{extension.name}</span>
          {(isInstalled || installState === "installed") && (
            <CheckCircle2Icon className="size-3 shrink-0 text-green-500" />
          )}
        </div>
        <p className="text-[11px] text-muted-foreground line-clamp-1">
          {extension.description}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-muted-foreground">{extension.author}</span>
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <DownloadIcon className="size-2.5" />
            {formatDownloads(extension.downloads)}
          </span>
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <StarIcon className="size-2.5 fill-yellow-500 text-yellow-500" />
            {extension.rating}
          </span>
        </div>
      </div>
      {!isInstalled && installState === "idle" && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleInstall();
          }}
          className={cn(
            "shrink-0 px-2 py-0.5 text-[10px] font-medium rounded-sm",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            "opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          )}
        >
          Install
        </button>
      )}
      {installState === "installing" && (
        <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          <Loader2Icon className="size-3 animate-spin" />
          Installing...
        </span>
      )}
      {installState === "installed" && !isInstalled && (
        <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-green-500">
          <CheckCircle2Icon className="size-3" />
          Installed
        </span>
      )}
    </div>
  );
};
