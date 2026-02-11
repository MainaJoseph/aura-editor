import type { Extension } from "@codemirror/state";

import { bracketColorizer } from "./bracket-colorizer";
import { indentRainbow } from "./indent-rainbow";
import { todoHighlight } from "./todo-highlight";

const featureMap: Record<string, () => Extension> = {
  "bracket-colorizer": bracketColorizer,
  "indent-rainbow": indentRainbow,
  "todo-highlight": todoHighlight,
};

export function getEditorFeatureExtensions(configKeys: string[]): Extension[] {
  return configKeys
    .filter((key) => key in featureMap)
    .map((key) => featureMap[key]());
}
