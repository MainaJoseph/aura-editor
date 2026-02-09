import { useCallback } from "react";

import { useEditorStore } from "../store/use-editor-store";
import { Id } from "../../../../convex/_generated/dataModel";

export const useEditorPane = (
  projectId: Id<"projects">,
  paneIndex: number
) => {
  const store = useEditorStore();
  const tabState = useEditorStore((state) =>
    state.getTabState(projectId, paneIndex)
  );
  const projectState = useEditorStore((state) =>
    state.getProjectState(projectId)
  );

  const isActivePane = projectState.activePaneIndex === paneIndex;

  const openFile = useCallback(
    (fileId: Id<"files">, options: { pinned: boolean }) => {
      store.setActivePane(projectId, paneIndex);
      store.openFile(projectId, fileId, options, paneIndex);
    },
    [store, projectId, paneIndex]
  );

  const closeTab = useCallback(
    (fileId: Id<"files">) => {
      store.setActivePane(projectId, paneIndex);
      store.closeTab(projectId, fileId, paneIndex);
    },
    [store, projectId, paneIndex]
  );

  const closeAllTabs = useCallback(() => {
    store.setActivePane(projectId, paneIndex);
    store.closeAllTabs(projectId, paneIndex);
  }, [store, projectId, paneIndex]);

  const setActiveTab = useCallback(
    (fileId: Id<"files">) => {
      store.setActivePane(projectId, paneIndex);
      store.setActiveTab(projectId, fileId, paneIndex);
    },
    [store, projectId, paneIndex]
  );

  const reorderTab = useCallback(
    (fromIndex: number, toIndex: number) => {
      store.setActivePane(projectId, paneIndex);
      store.reorderTab(projectId, fromIndex, toIndex, paneIndex);
    },
    [store, projectId, paneIndex]
  );

  const setActivePane = useCallback(() => {
    store.setActivePane(projectId, paneIndex);
  }, [store, projectId, paneIndex]);

  return {
    openTabs: tabState.openTabs,
    activeTabId: tabState.activeTabId,
    previewTabId: tabState.previewTabId,
    isActivePane,
    openFile,
    closeTab,
    closeAllTabs,
    setActiveTab,
    reorderTab,
    setActivePane,
  };
};
