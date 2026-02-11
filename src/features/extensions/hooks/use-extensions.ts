import { useQuery, useMutation } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

export function useMarketplaceExtensions(
  category?: "themes" | "languages" | "formatters" | "ai" | "productivity" | "snippets",
) {
  return useQuery(api.extensions.getMarketplaceExtensions, { category });
}

export function useInstalledExtensions(projectId: Id<"projects">) {
  return useQuery(api.extensions.getInstalledExtensions, { projectId });
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
