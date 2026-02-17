import { useCallback, useEffect, useMemo, useRef } from "react";
import { EditorView, keymap } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { indentWithTab } from "@codemirror/commands";
import { indentationMarkers } from "@replit/codemirror-indentation-markers";

import { minimap } from "../extensions/minimap";
import { customTheme } from "../extensions/theme";
import { getLanguageExtension } from "../extensions/language-extension";
import { customSetup } from "../extensions/custom-setup";
import { suggestion } from "../extensions/suggestion";
import { quickEdit } from "../extensions/quick-edit";
import { selectionTooltip } from "../extensions/selection-tooltip";
import { explain } from "../extensions/explain";
import { multiCursor } from "../extensions/multi-cursor";
import { getThemeExtension } from "../extensions/theme-registry";
import { getEditorFeatureExtensions } from "../extensions/editor-feature-registry";
import {
  remoteCursors,
  dispatchRemoteCursors,
  type RemoteCursor,
} from "../extensions/remote-cursors";

interface Props {
  fileName: string;
  initialValue?: string;
  themeConfigKey?: string | null;
  activeEditorFeatures?: string[];
  readOnly?: boolean;
  externalContent?: string;
  hasPendingEdits?: boolean;
  remoteCursorData?: RemoteCursor[];
  onChange?: (value: string) => void;
  onCursorChange?: (offset: number) => void;
}

export const CodeEditor = ({
  fileName,
  initialValue = "",
  themeConfigKey,
  activeEditorFeatures,
  readOnly = false,
  externalContent,
  hasPendingEdits = false,
  remoteCursorData,
  onChange,
  onCursorChange,
}: Props) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const cursorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isExternalUpdateRef = useRef(false);

  const languageExtension = useMemo(() => {
    return getLanguageExtension(fileName);
  }, [fileName]);

  // Stable callback ref for onChange so we can read the latest without re-creating the editor
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const onCursorChangeRef = useRef(onCursorChange);
  onCursorChangeRef.current = onCursorChange;

  const stableOnChange = useCallback((value: string) => {
    onChangeRef.current?.(value);
  }, []);

  useEffect(() => {
    if (!editorRef.current) return;

    const extensions = [
      getThemeExtension(themeConfigKey ?? null),
      customTheme,
      customSetup,
      multiCursor(),
      languageExtension,
      suggestion(fileName),
      quickEdit(fileName),
      explain(fileName),
      selectionTooltip(),
      keymap.of([indentWithTab]),
      minimap(),
      indentationMarkers(),
      ...getEditorFeatureExtensions(activeEditorFeatures ?? []),
      remoteCursors(),
      EditorView.editable.of(!readOnly),
      EditorState.readOnly.of(readOnly),
    ];

    if (!readOnly) {
      extensions.push(
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !isExternalUpdateRef.current) {
            stableOnChange(update.state.doc.toString());
          }
          if (update.selectionSet) {
            const offset = update.state.selection.main.head;
            if (cursorTimerRef.current) {
              clearTimeout(cursorTimerRef.current);
            }
            cursorTimerRef.current = setTimeout(() => {
              onCursorChangeRef.current?.(offset);
            }, 200);
          }
        }),
      );
    }

    const view = new EditorView({
      doc: initialValue,
      parent: editorRef.current,
      extensions,
    });

    viewRef.current = view;

    return () => {
      if (cursorTimerRef.current) {
        clearTimeout(cursorTimerRef.current);
      }
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialValue is only used for initial document; activeEditorFeatures serialized for stable comparison
  }, [languageExtension, themeConfigKey, activeEditorFeatures?.join(","), readOnly]);

  // External content sync — update editor when content changes from outside (other users, AI agent)
  // Skip when the user has pending unsaved local edits to avoid overwriting their in-flight work.
  useEffect(() => {
    const view = viewRef.current;
    if (!view || externalContent === undefined) return;

    // Don't overwrite if the user has unsaved local edits (debounce in flight)
    if (hasPendingEdits) return;

    const currentDoc = view.state.doc.toString();
    if (externalContent === currentDoc) return;

    const selection = view.state.selection.main;
    isExternalUpdateRef.current = true;
    view.dispatch({
      changes: {
        from: 0,
        to: currentDoc.length,
        insert: externalContent,
      },
      selection: {
        anchor: Math.min(selection.anchor, externalContent.length),
        head: Math.min(selection.head, externalContent.length),
      },
    });
    isExternalUpdateRef.current = false;
  }, [externalContent, hasPendingEdits]);

  // Remote cursors sync
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !remoteCursorData) return;
    dispatchRemoteCursors(view, remoteCursorData);
  }, [remoteCursorData]);

  return <div ref={editorRef} className="size-full pl-4 bg-background" />;
};
