import { type Extension, type Range, RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";

const INDENT_SIZE = 4;
const LEVEL_COUNT = 4;

const indentDecorations = Array.from({ length: LEVEL_COUNT }, (_, i) =>
  Decoration.mark({ class: `cm-indent-level-${i}` }),
);

function buildDecorations(view: EditorView): DecorationSet {
  const decorations: Range<Decoration>[] = [];

  for (const { from, to } of view.visibleRanges) {
    for (let pos = from; pos < to; ) {
      const line = view.state.doc.lineAt(pos);
      const text = line.text;

      let col = 0;
      let charIdx = 0;
      while (charIdx < text.length) {
        if (text[charIdx] === " ") {
          col++;
          charIdx++;
        } else if (text[charIdx] === "\t") {
          col += INDENT_SIZE;
          charIdx++;
        } else {
          break;
        }
      }

      if (col >= INDENT_SIZE) {
        // Walk through leading whitespace, applying decorations per indent unit
        let currentCol = 0;
        let idx = 0;
        let level = 0;

        while (idx < charIdx) {
          const unitStart = line.from + idx;
          let unitCols = 0;

          // Consume one indent unit worth of columns
          while (idx < charIdx && unitCols < INDENT_SIZE) {
            if (text[idx] === "\t") {
              unitCols += INDENT_SIZE - (currentCol % INDENT_SIZE);
            } else {
              unitCols++;
            }
            currentCol += text[idx] === "\t" ? INDENT_SIZE - ((currentCol) % INDENT_SIZE) : 1;
            idx++;
          }

          const unitEnd = line.from + idx;
          if (unitEnd > unitStart) {
            decorations.push(
              indentDecorations[level % LEVEL_COUNT].range(unitStart, unitEnd),
            );
            level++;
          }
        }
      }

      pos = line.to + 1;
    }
  }

  decorations.sort((a, b) => a.from - b.from || a.to - b.to);

  const builder = new RangeSetBuilder<Decoration>();
  for (const d of decorations) {
    builder.add(d.from, d.to, d.value);
  }
  return builder.finish();
}

const indentPlugin = ViewPlugin.fromClass(
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

const indentTheme = EditorView.baseTheme({
  ".cm-indent-level-0": { backgroundColor: "rgba(255, 235, 59, 0.1)" },
  ".cm-indent-level-1": { backgroundColor: "rgba(76, 175, 80, 0.1)" },
  ".cm-indent-level-2": { backgroundColor: "rgba(33, 150, 243, 0.1)" },
  ".cm-indent-level-3": { backgroundColor: "rgba(156, 39, 176, 0.1)" },
});

export function indentRainbow(): Extension {
  return [indentPlugin, indentTheme];
}
