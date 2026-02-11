"use client";

import { useMemo, useState, useEffect } from "react";
import {
  DownloadIcon,
  StarIcon,
  CheckCircle2Icon,
  Loader2Icon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDownloads } from "../constants";
import { ExtensionIcon } from "./extension-icon";
import {
  useInstalledExtensions,
  useInstallExtension,
  useUninstallExtension,
} from "../hooks/use-extensions";
import { Doc, Id } from "../../../../convex/_generated/dataModel";
import { ExtensionTabData } from "@/features/editor/store/use-editor-store";

interface ExtensionDetailPageProps {
  extension: Doc<"extensions"> | ExtensionTabData;
  projectId: Id<"projects">;
}

export const ExtensionDetailPage = ({
  extension,
  projectId,
}: ExtensionDetailPageProps) => {
  const installedExtensions = useInstalledExtensions(projectId);
  const installExtension = useInstallExtension();
  const uninstallExtension = useUninstallExtension();

  const [installState, setInstallState] = useState<"idle" | "installing" | "installed">("idle");

  const isInstalled = useMemo(() => {
    if (!installedExtensions) return false;
    return installedExtensions.some(
      (i) => (i as { extensionId: string }).extensionId === extension._id,
    );
  }, [installedExtensions, extension._id]);

  // Reset state when isInstalled changes externally
  useEffect(() => {
    if (isInstalled) {
      setInstallState("idle");
    }
  }, [isInstalled]);

  const handleInstall = async () => {
    setInstallState("installing");
    try {
      await installExtension({ projectId, extensionId: extension._id });
      setInstallState("installed");
      setTimeout(() => setInstallState("idle"), 2000);
    } catch {
      setInstallState("idle");
    }
  };

  const handleUninstall = async () => {
    await uninstallExtension({ projectId, extensionId: extension._id });
  };

  const stars = Array.from({ length: 5 }, (_, i) => i < Math.round(extension.rating));

  return (
    <div className="h-full flex flex-col bg-background">
      <ScrollArea className="flex-1">
        <div className="max-w-2xl mx-auto p-8">
          {/* Header */}
          <div className="flex items-start gap-5">
            <ExtensionIcon
              name={extension.icon}
              category={extension.category}
              size="lg"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold">{extension.name}</h1>
                {isInstalled && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <CheckCircle2Icon className="size-3 text-green-500" />
                    Installed
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {extension.author}
              </p>
              <div className="flex items-center gap-4 mt-2">
                <Badge variant="outline" className="text-xs">
                  v{extension.version}
                </Badge>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <DownloadIcon className="size-3" />
                  {formatDownloads(extension.downloads)} installs
                </span>
                <span className="flex items-center gap-0.5 text-xs">
                  {stars.map((filled, i) => (
                    <StarIcon
                      key={i}
                      className={cn(
                        "size-3",
                        filled
                          ? "fill-yellow-500 text-yellow-500"
                          : "text-muted-foreground/30",
                      )}
                    />
                  ))}
                  <span className="text-muted-foreground ml-1">
                    {extension.rating}
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-2 mt-4">
                {installState === "installing" ? (
                  <button
                    disabled
                    className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-sm bg-primary/70 text-primary-foreground cursor-not-allowed"
                  >
                    <Loader2Icon className="size-3.5 animate-spin" />
                    Installing...
                  </button>
                ) : installState === "installed" && !isInstalled ? (
                  <button
                    disabled
                    className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-sm bg-green-500/10 text-green-500 border border-green-500/30 cursor-not-allowed"
                  >
                    <CheckCircle2Icon className="size-3.5" />
                    Installed
                  </button>
                ) : (
                  <button
                    onClick={isInstalled ? handleUninstall : handleInstall}
                    className={cn(
                      "px-4 py-1.5 text-sm font-medium rounded-sm cursor-pointer transition-colors",
                      isInstalled
                        ? "bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/30"
                        : "bg-primary text-primary-foreground hover:bg-primary/90",
                    )}
                  >
                    {isInstalled ? "Uninstall" : "Install"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-border my-6" />

          {/* Description */}
          <div>
            <h2 className="text-sm font-semibold mb-2">Description</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {extension.longDescription}
            </p>
          </div>

          {/* Details grid */}
          <div className="h-px bg-border my-6" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-1">
                Category
              </h3>
              <Badge variant="secondary" className="text-xs capitalize">
                {extension.category}
              </Badge>
            </div>
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-1">
                Type
              </h3>
              <Badge variant="secondary" className="text-xs">
                {extension.extensionType}
              </Badge>
            </div>
          </div>

          {/* Tags */}
          {extension.tags.length > 0 && (
            <>
              <div className="h-px bg-border my-6" />
              <div>
                <h2 className="text-sm font-semibold mb-2">Tags</h2>
                <div className="flex flex-wrap gap-1.5">
                  {extension.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-xs"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
