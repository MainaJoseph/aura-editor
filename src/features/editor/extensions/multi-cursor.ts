import { EditorSelection } from "@codemirror/state";
import { EditorView, keymap, type Command } from "@codemirror/view";

const addCursorUp: Command = (view) => {
  const { state } = view;
  const newRanges = [];

  for (const range of state.selection.ranges) {
    const line = state.doc.lineAt(range.head);
    if (line.number > 1) {
      const targetLine = state.doc.line(line.number - 1);
      const col = range.head - line.from;
      const pos = targetLine.from + Math.min(col, targetLine.length);
      newRanges.push(EditorSelection.cursor(pos));
    }
  }

  if (newRanges.length === 0) return false;

  view.dispatch({
    selection: EditorSelection.create(
      [...state.selection.ranges, ...newRanges],
      state.selection.mainIndex,
    ),
  });
  return true;
};

const addCursorDown: Command = (view) => {
  const { state } = view;
  const newRanges = [];

  for (const range of state.selection.ranges) {
    const line = state.doc.lineAt(range.head);
    if (line.number < state.doc.lines) {
      const targetLine = state.doc.line(line.number + 1);
      const col = range.head - line.from;
      const pos = targetLine.from + Math.min(col, targetLine.length);
      newRanges.push(EditorSelection.cursor(pos));
    }
  }

  if (newRanges.length === 0) return false;

  view.dispatch({
    selection: EditorSelection.create(
      [...state.selection.ranges, ...newRanges],
      state.selection.mainIndex,
    ),
  });
  return true;
};

export const multiCursor = () => [
  EditorView.clickAddsSelectionRange.of((event) => event.altKey),
  keymap.of([
    { key: "Mod-Alt-ArrowUp", run: addCursorUp },
    { key: "Mod-Alt-ArrowDown", run: addCursorDown },
  ]),
];
