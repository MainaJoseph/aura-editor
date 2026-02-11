import { Id } from "../../../../convex/_generated/dataModel";
import { useInstalledExtensions } from "@/features/extensions/hooks/use-extensions";

export function useActiveTheme(projectId: Id<"projects">): string | null {
  const installed = useInstalledExtensions(projectId);

  if (!installed) return null;

  const activeTheme = installed
    .filter(
      (inst) =>
        inst &&
        inst.extension.extensionType === "codemirror-theme" &&
        inst.enabled,
    )
    .sort((a, b) => b!.installedAt - a!.installedAt)[0];

  return activeTheme?.extension.configKey ?? null;
}
