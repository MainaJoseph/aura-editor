import { useCallback, useMemo } from "react";

import { useEditorStore, ExtensionTabData } from "../store/use-editor-store";
import { Id } from "../../../../convex/_generated/dataModel";

export const useEditor = (projectId: Id<"projects">) => {
  const store = useEditorStore();
  const projectState = useEditorStore((state) =>
    state.getProjectState(projectId)
  );

  const allOpenTabs = useMemo(() => {
    return [...new Set(projectState.panes.flatMap((p) => p.openTabs))];
  }, [projectState.panes]);
  const activePaneIndex = projectState.activePaneIndex;
  const tabState = projectState.panes[activePaneIndex] ?? {
    openTabs: [] as Id<"files">[],
    activeTabId: null,
    previewTabId: null,
  };

  const openFile = useCallback(
    (fileId: Id<"files">, options: { pinned: boolean }) => {
      store.openFile(projectId, fileId, options);
    },
    [store, projectId]
  );

  const closeTab = useCallback(
    (fileId: Id<"files">) => {
      store.closeTab(projectId, fileId);
    },
    [store, projectId]
  );

  const closeAllTabs = useCallback(() => {
    store.closeAllTabs(projectId);
  }, [store, projectId]);

  const setActiveTab = useCallback(
    (fileId: Id<"files">) => {
      store.setActiveTab(projectId, fileId);
    },
    [store, projectId]
  );

  const reorderTab = useCallback(
    (fromIndex: number, toIndex: number) => {
      store.reorderTab(projectId, fromIndex, toIndex);
    },
    [store, projectId]
  );

  const splitEditor = useCallback(
    (fileId?: Id<"files">) => {
      store.splitEditor(projectId, fileId);
    },
    [store, projectId]
  );

  const closeSplit = useCallback(
    (paneIndex: number) => {
      store.closeSplit(projectId, paneIndex);
    },
    [store, projectId]
  );

  const setActivePane = useCallback(
    (paneIndex: number) => {
      store.setActivePane(projectId, paneIndex);
    },
    [store, projectId]
  );

  const closeAllTabsAllPanes = useCallback(() => {
    store.closeAllTabsAllPanes(projectId);
  }, [store, projectId]);

  const triggerSaveAll = useCallback(() => {
    store.triggerSaveAll();
  }, [store]);

  const openExtensions = projectState.openExtensions;
  const activeExtensionId = projectState.activeExtensionId;

  const openExtensionTab = useCallback(
    (extension: ExtensionTabData) => {
      store.openExtensionTab(projectId, extension);
    },
    [store, projectId]
  );

  const closeExtensionTab = useCallback(
    (extensionId: Id<"extensions">) => {
      store.closeExtensionTab(projectId, extensionId);
    },
    [store, projectId]
  );

  const setActiveExtensionTab = useCallback(
    (extensionId: Id<"extensions">) => {
      store.setActiveExtensionTab(projectId, extensionId);
    },
    [store, projectId]
  );

  const clearActiveExtension = useCallback(() => {
    store.clearActiveExtension(projectId);
  }, [store, projectId]);

  const reorderExtensionTab = useCallback(
    (fromIndex: number, toIndex: number) => {
      store.reorderExtensionTab(projectId, fromIndex, toIndex);
    },
    [store, projectId]
  );

  return {
    openTabs: tabState.openTabs,
    activeTabId: tabState.activeTabId,
    previewTabId: tabState.previewTabId,
    openFile,
    closeTab,
    closeAllTabs,
    setActiveTab,
    reorderTab,
    // Split editor
    paneCount: projectState.panes.length,
    activePaneIndex,
    isSplit: projectState.panes.length > 1,
    splitEditor,
    closeSplit,
    setActivePane,
    // Open editors
    allOpenTabs,
    closeAllTabsAllPanes,
    triggerSaveAll,
    // Extension tabs
    openExtensions,
    activeExtensionId,
    openExtensionTab,
    closeExtensionTab,
    setActiveExtensionTab,
    clearActiveExtension,
    reorderExtensionTab,
  };
};
