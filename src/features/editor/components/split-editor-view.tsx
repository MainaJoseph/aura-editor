import { useEffect } from "react";
import { Allotment } from "allotment";

import { useEditor } from "../hooks/use-editor";
import { EditorPane } from "./editor-pane";
import { Id } from "../../../../convex/_generated/dataModel";

export const SplitEditorView = ({
  projectId,
}: {
  projectId: Id<"projects">;
}) => {
  const { isSplit, splitEditor, closeSplit } = useEditor(projectId);

  // Keyboard shortcut: Ctrl+\ to toggle split
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "\\") {
        e.preventDefault();
        if (isSplit) {
          closeSplit(1);
        } else {
          splitEditor();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSplit, splitEditor, closeSplit]);

  if (!isSplit) {
    return <EditorPane projectId={projectId} paneIndex={0} />;
  }

  return (
    <Allotment>
      <Allotment.Pane>
        <EditorPane projectId={projectId} paneIndex={0} />
      </Allotment.Pane>
      <Allotment.Pane>
        <EditorPane projectId={projectId} paneIndex={1} />
      </Allotment.Pane>
    </Allotment>
  );
};
