import { type Extension, type Range, RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";

const KEYWORDS = ["TODO", "FIXME", "HACK", "NOTE", "BUG", "XXX"] as const;

const keywordDecorations: Record<string, Decoration> = {};
for (const kw of KEYWORDS) {
  keywordDecorations[kw] = Decoration.mark({
    class: `cm-todo-${kw.toLowerCase()}`,
  });
}

const KEYWORD_PATTERN = new RegExp(
  `\\b(${KEYWORDS.join("|")})([:\\s]|$)`,
  "g",
);

function buildDecorations(view: EditorView): DecorationSet {
  const decorations: Range<Decoration>[] = [];

  for (const { from, to } of view.visibleRanges) {
    for (let pos = from; pos < to; ) {
      const line = view.state.doc.lineAt(pos);
      const text = line.text;

      KEYWORD_PATTERN.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = KEYWORD_PATTERN.exec(text)) !== null) {
        const keyword = match[1];
        const start = line.from + match.index;
        const end = start + keyword.length;
        decorations.push(keywordDecorations[keyword].range(start, end));
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

const todoPlugin = ViewPlugin.fromClass(
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

const todoTheme = EditorView.baseTheme({
  ".cm-todo-todo": {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    color: "#f59e0b",
    borderRadius: "2px",
    padding: "0 2px",
  },
  ".cm-todo-fixme": {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    color: "#ef4444",
    borderRadius: "2px",
    padding: "0 2px",
  },
  ".cm-todo-hack": {
    backgroundColor: "rgba(168, 85, 247, 0.2)",
    color: "#a855f7",
    borderRadius: "2px",
    padding: "0 2px",
  },
  ".cm-todo-note": {
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    color: "#3b82f6",
    borderRadius: "2px",
    padding: "0 2px",
  },
  ".cm-todo-bug": {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    color: "#ef4444",
    borderRadius: "2px",
    padding: "0 2px",
  },
  ".cm-todo-xxx": {
    backgroundColor: "rgba(249, 115, 22, 0.2)",
    color: "#f97316",
    borderRadius: "2px",
    padding: "0 2px",
  },
});

export function todoHighlight(): Extension {
  return [todoPlugin, todoTheme];
}
