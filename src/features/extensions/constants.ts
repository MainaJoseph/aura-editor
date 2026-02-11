export const EXTENSION_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "themes", label: "Themes" },
  { id: "languages", label: "Languages" },
  { id: "formatters", label: "Formatters" },
  { id: "ai", label: "AI" },
  { id: "productivity", label: "Productivity" },
  { id: "snippets", label: "Snippets" },
] as const;

export type ExtensionCategory = (typeof EXTENSION_CATEGORIES)[number]["id"];

export function formatDownloads(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(0)}K`;
  }
  return count.toString();
}
