import { useQuery, useMutation } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import { Doc, Id } from "../../../../convex/_generated/dataModel";

export interface InstalledExtension {
  _id: Id<"installedExtensions">;
  _creationTime: number;
  projectId: Id<"projects">;
  extensionId: Id<"extensions">;
  enabled: boolean;
  installedAt: number;
  extension: Doc<"extensions">;
}

export function useMarketplaceExtensions(
  category?: "themes" | "languages" | "formatters" | "ai" | "productivity" | "snippets",
) {
  return useQuery(api.extensions.getMarketplaceExtensions, { category });
}

export function useInstalledExtensions(
  projectId: Id<"projects">,
): InstalledExtension[] | undefined {
  return useQuery(api.extensions.getInstalledExtensions, {
    projectId,
  }) as InstalledExtension[] | undefined;
}

export function useInstallExtension() {
  return useMutation(api.extensions.installExtension);
}

export function useUninstallExtension() {
  return useMutation(api.extensions.uninstallExtension);
}

export function useToggleExtension() {
  return useMutation(api.extensions.toggleExtension);
}
