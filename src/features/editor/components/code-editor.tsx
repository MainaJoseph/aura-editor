import { useEffect, useMemo, useRef } from "react";
import { EditorView, keymap } from "@codemirror/view";
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
import type { ConvexYjsProvider } from "../collaboration/convex-yjs-provider";

interface Props {
  fileName: string;
  initialValue?: string;
  themeConfigKey?: string | null;
  activeEditorFeatures?: string[];
  onChange?: (value: string) => void;
  yjsProvider?: ConvexYjsProvider | null;
}

export const CodeEditor = ({
  fileName,
  initialValue = "",
  themeConfigKey,
  activeEditorFeatures,
  onChange,
  yjsProvider,
}: Props) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const languageExtension = useMemo(() => {
    return getLanguageExtension(fileName);
  }, [fileName]);

  useEffect(() => {
    if (!editorRef.current) return;

    // Dynamic import for yCollab to avoid SSR issues
    let cancelled = false;

    const setupEditor = async () => {
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
      ];

      if (yjsProvider) {
        // Use yCollab for collaborative editing
        const { yCollab } = await import("y-codemirror.next");
        const { UndoManager } = await import("yjs");

        if (cancelled) return;

        const yText = yjsProvider.doc.getText("content");
        const undoManager = new UndoManager(yText);

        extensions.push(
          yCollab(yText, yjsProvider.awareness, { undoManager }),
        );
      } else if (onChange) {
        // Single-player mode: use onChange listener
        extensions.push(
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChange(update.state.doc.toString());
            }
          }),
        );
      }

      if (cancelled || !editorRef.current) return;

      const view = new EditorView({
        // When using yCollab, don't set doc — yCollab manages content via Yjs binding
        ...(yjsProvider ? {} : { doc: initialValue }),
        parent: editorRef.current,
        extensions,
      });

      viewRef.current = view;
    };

    setupEditor();

    return () => {
      cancelled = true;
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialValue is only used for initial document; activeEditorFeatures serialized for stable comparison
  }, [languageExtension, themeConfigKey, activeEditorFeatures?.join(","), yjsProvider]);

  return <div ref={editorRef} className="size-full pl-4 bg-background" />;
};
