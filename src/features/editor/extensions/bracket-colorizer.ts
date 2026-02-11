import {
  type Extension,
  type Range,
  RangeSetBuilder,
} from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";

const BRACKET_PAIRS = new Set(["(", ")", "[", "]", "{", "}"]);
const DEPTH_COUNT = 6;

const bracketDecorations = Array.from({ length: DEPTH_COUNT }, (_, i) =>
  Decoration.mark({ class: `cm-bracket-depth-${i}` }),
);

function buildDecorations(view: EditorView): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const depthStack: number[] = [];
  let depth = 0;

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter(node) {
        const text = view.state.sliceDoc(node.from, node.to);
        if (text.length === 1 && BRACKET_PAIRS.has(text)) {
          if (text === "(" || text === "[" || text === "{") {
            decorations.push(
              bracketDecorations[depth % DEPTH_COUNT].range(node.from, node.to),
            );
            depthStack.push(depth);
            depth++;
          } else {
            depth = Math.max(0, depth - 1);
            decorations.push(
              bracketDecorations[depth % DEPTH_COUNT].range(node.from, node.to),
            );
            if (depthStack.length > 0) {
              depth = depthStack.pop()! + 1;
              depth--;
            }
          }
        }
      },
    });
  }

  // Sort decorations by start position (required by RangeSetBuilder)
  decorations.sort((a, b) => a.from - b.from || a.to - b.to);

  const builder = new RangeSetBuilder<Decoration>();
  for (const d of decorations) {
    builder.add(d.from, d.to, d.value);
  }
  return builder.finish();
}

const bracketPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations },
);

const bracketTheme = EditorView.baseTheme({
  ".cm-bracket-depth-0": { color: "gold" },
  ".cm-bracket-depth-1": { color: "orchid" },
  ".cm-bracket-depth-2": { color: "cornflowerblue" },
  ".cm-bracket-depth-3": { color: "lightgreen" },
  ".cm-bracket-depth-4": { color: "orange" },
  ".cm-bracket-depth-5": { color: "hotpink" },
});

export function bracketColorizer(): Extension {
  return [bracketPlugin, bracketTheme];
}
