import { Id } from "../../../../convex/_generated/dataModel";
import { useInstalledExtensions } from "@/features/extensions/hooks/use-extensions";

export function useMaterialIcons(projectId: Id<"projects">): boolean {
  const installed = useInstalledExtensions(projectId);

  if (!installed) return false;

  return installed.some(
    (inst) =>
      inst &&
      inst.extension.configKey === "material-icons" &&
      inst.enabled,
  );
}
