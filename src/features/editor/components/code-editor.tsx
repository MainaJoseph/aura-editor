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

interface Props {
  fileName: string;
  initialValue?: string;
  themeConfigKey?: string | null;
  activeEditorFeatures?: string[];
  onChange: (value: string) => void;
}

export const CodeEditor = ({
  fileName,
  initialValue = "",
  themeConfigKey,
  activeEditorFeatures,
  onChange,
}: Props) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const languageExtension = useMemo(() => {
    return getLanguageExtension(fileName);
  }, [fileName]);

  useEffect(() => {
    if (!editorRef.current) return;

    const view = new EditorView({
      doc: initialValue,
      parent: editorRef.current,
      extensions: [
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
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        }),
      ],
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialValue is only used for initial document; activeEditorFeatures serialized for stable comparison
  }, [languageExtension, themeConfigKey, activeEditorFeatures?.join(",")]);

  return <div ref={editorRef} className="size-full pl-4 bg-background" />;
};
