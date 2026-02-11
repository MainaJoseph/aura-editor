"use client";

import { Switch } from "@/components/ui/switch";
import { ExtensionIcon } from "./extension-icon";
import { Doc } from "../../../../convex/_generated/dataModel";

interface InstalledExtensionItemProps {
  extension: Doc<"extensions">;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  onClick: () => void;
}

export const InstalledExtensionItem = ({
  extension,
  enabled,
  onToggle,
  onClick,
}: InstalledExtensionItemProps) => {
  return (
    <div
      role="button"
      onClick={onClick}
      className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent/30 cursor-pointer"
    >
      <ExtensionIcon name={extension.icon} category={extension.category} size="sm" />
      <div className="flex-1 min-w-0">
        <span className="text-xs truncate block">{extension.name}</span>
      </div>
      <span className="text-[10px] text-muted-foreground shrink-0">
        v{extension.version}
      </span>
      <Switch
        checked={enabled}
        onCheckedChange={(checked) => {
          onToggle(checked);
        }}
        onClick={(e) => e.stopPropagation()}
        className="shrink-0"
      />
    </div>
  );
};
