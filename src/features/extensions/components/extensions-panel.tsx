"use client";

import { useState, useMemo } from "react";
import {
  SearchIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Id, Doc } from "../../../../convex/_generated/dataModel";

import {
  useMarketplaceExtensions,
  useInstalledExtensions,
  useInstallExtension,
  useUninstallExtension,
  useToggleExtension,
} from "../hooks/use-extensions";
import {
  EXTENSION_CATEGORIES,
  type ExtensionCategory,
} from "../constants";
import { ExtensionCard } from "./extension-card";
import { InstalledExtensionItem } from "./installed-extension-item";

interface ExtensionsPanelProps {
  projectId: Id<"projects">;
  onSelectExtension: (extension: Doc<"extensions">) => void;
}

export const ExtensionsPanel = ({ projectId, onSelectExtension }: ExtensionsPanelProps) => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ExtensionCategory>("all");
  const [installedCollapsed, setInstalledCollapsed] = useState(false);
  const [marketplaceCollapsed, setMarketplaceCollapsed] = useState(false);

  const marketplaceExtensions = useMarketplaceExtensions(
    category === "all" ? undefined : category,
  );
  const installedExtensions = useInstalledExtensions(projectId);
  const installExtension = useInstallExtension();
  const uninstallExtension = useUninstallExtension();
  const toggleExtension = useToggleExtension();

  const installedIds = useMemo(() => {
    if (!installedExtensions) return new Set<string>();
    return new Set(
      installedExtensions.map((i) => i.extensionId),
    );
  }, [installedExtensions]);

  const filteredMarketplace = useMemo(() => {
    if (!marketplaceExtensions) return [];
    if (!search) return marketplaceExtensions;
    const q = search.toLowerCase();
    return marketplaceExtensions.filter(
      (ext) =>
        ext.name.toLowerCase().includes(q) ||
        ext.description.toLowerCase().includes(q) ||
        ext.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [marketplaceExtensions, search]);

  const filteredInstalled = useMemo(() => {
    if (!installedExtensions) return [];
    if (!search) return installedExtensions;
    const q = search.toLowerCase();
    return installedExtensions.filter((item) => {
      const ext = item.extension;
      return (
        ext.name.toLowerCase().includes(q) ||
        ext.description.toLowerCase().includes(q) ||
        ext.tags.some((t: string) => t.toLowerCase().includes(q))
      );
    });
  }, [installedExtensions, search]);

  const handleInstall = async (extensionId: Id<"extensions">) => {
    await installExtension({ projectId, extensionId });
  };

  const handleToggle = async (extensionId: Id<"extensions">, enabled: boolean) => {
    await toggleExtension({ projectId, extensionId, enabled });
  };

  return (
    <div className="h-full bg-sidebar flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-0.5 h-5.5 bg-accent font-bold px-2">
        <p className="text-xs uppercase">Extensions</p>
      </div>

      {/* Search */}
      <div className="p-2 border-b">
        <div className="flex items-center gap-1.5 h-6 px-1.5 bg-background border border-input focus-within:border-ring">
          <SearchIcon className="size-3 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search extensions..."
            className="flex-1 min-w-0 text-xs bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-1 mt-2">
          {EXTENSION_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={cn(
                "px-1.5 py-0.5 text-[10px] rounded-sm cursor-pointer transition-colors",
                category === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent/50 text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0 overflow-hidden">
        {/* Installed section */}
        {filteredInstalled.length > 0 && (
          <div>
            <button
              onClick={() => setInstalledCollapsed((v) => !v)}
              className="w-full flex items-center gap-1 h-6 px-2 hover:bg-accent/30 cursor-pointer"
            >
              {installedCollapsed ? (
                <ChevronRightIcon className="size-3 text-muted-foreground" />
              ) : (
                <ChevronDownIcon className="size-3 text-muted-foreground" />
              )}
              <span className="text-[11px] font-semibold uppercase">Installed</span>
              <Badge
                variant="secondary"
                className="ml-auto h-4 min-w-4 text-[10px] px-1"
              >
                {filteredInstalled.length}
              </Badge>
            </button>
            {!installedCollapsed &&
              filteredInstalled.map((item) => (
                  <InstalledExtensionItem
                    key={item._id}
                    extension={item.extension}
                    enabled={item.enabled}
                    onToggle={(enabled) => handleToggle(item.extensionId, enabled)}
                    onClick={() => onSelectExtension(item.extension)}
                  />
              ))}
          </div>
        )}

        {/* Marketplace section */}
        <div>
          <button
            onClick={() => setMarketplaceCollapsed((v) => !v)}
            className="w-full flex items-center gap-1 h-6 px-2 hover:bg-accent/30 cursor-pointer"
          >
            {marketplaceCollapsed ? (
              <ChevronRightIcon className="size-3 text-muted-foreground" />
            ) : (
              <ChevronDownIcon className="size-3 text-muted-foreground" />
            )}
            <span className="text-[11px] font-semibold uppercase">Marketplace</span>
            <Badge
              variant="secondary"
              className="ml-auto h-4 min-w-4 text-[10px] px-1"
            >
              {filteredMarketplace.length}
            </Badge>
          </button>
          {!marketplaceCollapsed &&
            filteredMarketplace.map((ext) => (
              <ExtensionCard
                key={ext._id}
                extension={ext}
                isInstalled={installedIds.has(ext._id)}
                onInstall={() => handleInstall(ext._id)}
                onClick={() => onSelectExtension(ext)}
              />
            ))}
        </div>

        {/* Empty states */}
        {!marketplaceExtensions && (
          <div className="flex items-center justify-center py-8">
            <span className="text-xs text-muted-foreground">Loading extensions...</span>
          </div>
        )}
        {marketplaceExtensions &&
          filteredMarketplace.length === 0 &&
          filteredInstalled.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <span className="text-xs text-muted-foreground">
                No extensions found
              </span>
            </div>
          )}
      </ScrollArea>
    </div>
  );
};
