import type { Extension } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { dracula } from "@uiw/codemirror-theme-dracula";
import { githubLight } from "@uiw/codemirror-theme-github";
import { solarizedDark } from "@uiw/codemirror-theme-solarized";
import { espresso } from "thememirror";

const themeMap: Record<string, Extension> = {
  "one-dark-pro": oneDark,
  dracula: dracula,
  "github-light": githubLight,
  "solarized-dark": solarizedDark,
  "monokai-pro": espresso,
};

export function getThemeExtension(configKey: string | null): Extension {
  if (configKey && configKey in themeMap) {
    return themeMap[configKey];
  }
  return oneDark;
}
