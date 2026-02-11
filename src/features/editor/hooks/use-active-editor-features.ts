import { Id } from "../../../../convex/_generated/dataModel";
import { useInstalledExtensions } from "@/features/extensions/hooks/use-extensions";

export function useActiveEditorFeatures(projectId: Id<"projects">): string[] {
  const installed = useInstalledExtensions(projectId);

  if (!installed) return [];

  return installed
    .filter(
      (inst) =>
        inst &&
        inst.extension.extensionType === "editor-feature" &&
        inst.enabled,
    )
    .map((inst) => inst!.extension.configKey)
    .filter((key): key is string => key !== undefined);
}
