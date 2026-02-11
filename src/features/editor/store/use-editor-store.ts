import { create } from "zustand";

import { Id } from "../../../../convex/_generated/dataModel";

export interface ExtensionTabData {
  _id: Id<"extensions">;
  _creationTime: number;
  slug: string;
  name: string;
  description: string;
  longDescription: string;
  author: string;
  version: string;
  icon: string;
  category: string;
  tags: string[];
  downloads: number;
  rating: number;
  extensionType: string;
  configKey?: string;
  updatedAt: number;
}

interface TabState {
  openTabs: Id<"files">[];
  activeTabId: Id<"files"> | null;
  previewTabId: Id<"files"> | null;
}

const defaultTabState: TabState = {
  openTabs: [],
  activeTabId: null,
  previewTabId: null,
};

interface ProjectEditorState {
  panes: TabState[];
  activePaneIndex: number;
  openExtensions: ExtensionTabData[];
  activeExtensionId: Id<"extensions"> | null;
}

const defaultProjectState: ProjectEditorState = {
  panes: [{ ...defaultTabState }],
  activePaneIndex: 0,
  openExtensions: [],
  activeExtensionId: null,
};

interface EditorStore {
  tabs: Map<Id<"projects">, ProjectEditorState>;
  saveAllSignal: number;
  getProjectState: (projectId: Id<"projects">) => ProjectEditorState;
  getTabState: (projectId: Id<"projects">, paneIndex?: number) => TabState;
  openFile: (
    projectId: Id<"projects">,
    fileId: Id<"files">,
    options: { pinned: boolean },
    paneIndex?: number
  ) => void;
  closeTab: (
    projectId: Id<"projects">,
    fileId: Id<"files">,
    paneIndex?: number
  ) => void;
  closeAllTabs: (projectId: Id<"projects">, paneIndex?: number) => void;
  closeAllTabsAllPanes: (projectId: Id<"projects">) => void;
  setActiveTab: (
    projectId: Id<"projects">,
    fileId: Id<"files">,
    paneIndex?: number
  ) => void;
  reorderTab: (
    projectId: Id<"projects">,
    fromIndex: number,
    toIndex: number,
    paneIndex?: number
  ) => void;
  splitEditor: (projectId: Id<"projects">, fileId?: Id<"files">) => void;
  closeSplit: (projectId: Id<"projects">, paneIndex: number) => void;
  setActivePane: (projectId: Id<"projects">, paneIndex: number) => void;
  triggerSaveAll: () => void;
  openExtensionTab: (
    projectId: Id<"projects">,
    extension: ExtensionTabData
  ) => void;
  closeExtensionTab: (
    projectId: Id<"projects">,
    extensionId: Id<"extensions">
  ) => void;
  setActiveExtensionTab: (
    projectId: Id<"projects">,
    extensionId: Id<"extensions">
  ) => void;
  clearActiveExtension: (projectId: Id<"projects">) => void;
  reorderExtensionTab: (
    projectId: Id<"projects">,
    fromIndex: number,
    toIndex: number
  ) => void;
}

export const useEditorStore = create<EditorStore>()((set, get) => ({
  tabs: new Map(),
  saveAllSignal: 0,

  getProjectState: (projectId) => {
    return get().tabs.get(projectId) ?? defaultProjectState;
  },

  getTabState: (projectId, paneIndex?) => {
    const project = get().tabs.get(projectId) ?? defaultProjectState;
    const idx = paneIndex ?? project.activePaneIndex;
    return project.panes[idx] ?? defaultTabState;
  },

  openFile: (projectId, fileId, { pinned }, paneIndex?) => {
    const tabs = new Map(get().tabs);
    const project = tabs.get(projectId) ?? {
      ...defaultProjectState,
      panes: [{ ...defaultTabState }],
    };
    const idx = paneIndex ?? project.activePaneIndex;
    const state = project.panes[idx] ?? defaultTabState;
    const { openTabs, previewTabId } = state;
    const isOpen = openTabs.includes(fileId);

    let newPaneState: TabState;

    // Case 1: Opening as preview - replace existing preview or add new
    if (!isOpen && !pinned) {
      const newTabs = previewTabId
        ? openTabs.map((id) => (id === previewTabId ? fileId : id))
        : [...openTabs, fileId];

      newPaneState = {
        openTabs: newTabs,
        activeTabId: fileId,
        previewTabId: fileId,
      };
    }
    // Case 2: Opening as pinned - add new tab
    else if (!isOpen && pinned) {
      newPaneState = {
        ...state,
        openTabs: [...openTabs, fileId],
        activeTabId: fileId,
      };
    }
    // Case 3: File already open - just activate (and pin if double-clicked)
    else {
      const shouldPin = pinned && previewTabId === fileId;
      newPaneState = {
        ...state,
        activeTabId: fileId,
        previewTabId: shouldPin ? null : previewTabId,
      };
    }

    const newPanes = [...project.panes];
    newPanes[idx] = newPaneState;
    tabs.set(projectId, { ...project, panes: newPanes, activeExtensionId: null });
    set({ tabs });
  },

  closeTab: (projectId, fileId, paneIndex?) => {
    const tabs = new Map(get().tabs);
    const project = tabs.get(projectId) ?? {
      ...defaultProjectState,
      panes: [{ ...defaultTabState }],
    };
    const idx = paneIndex ?? project.activePaneIndex;
    const state = project.panes[idx] ?? defaultTabState;
    const { openTabs, activeTabId, previewTabId } = state;
    const tabIndex = openTabs.indexOf(fileId);

    if (tabIndex === -1) return;

    const newTabs = openTabs.filter((id) => id !== fileId);

    let newActiveTabId = activeTabId;
    if (activeTabId === fileId) {
      if (newTabs.length === 0) {
        newActiveTabId = null;
      } else if (tabIndex >= newTabs.length) {
        newActiveTabId = newTabs[newTabs.length - 1];
      } else {
        newActiveTabId = newTabs[tabIndex];
      }
    }

    const newPaneState: TabState = {
      openTabs: newTabs,
      activeTabId: newActiveTabId,
      previewTabId: previewTabId === fileId ? null : previewTabId,
    };

    const newPanes = [...project.panes];
    newPanes[idx] = newPaneState;

    // Auto-close split when last tab in a pane is closed
    if (newTabs.length === 0 && newPanes.length > 1) {
      newPanes.splice(idx, 1);
      tabs.set(projectId, {
        ...project,
        panes: newPanes,
        activePaneIndex: 0,
      });
    } else {
      tabs.set(projectId, { ...project, panes: newPanes });
    }

    set({ tabs });
  },

  closeAllTabs: (projectId, paneIndex?) => {
    const tabs = new Map(get().tabs);
    const project = tabs.get(projectId) ?? {
      ...defaultProjectState,
      panes: [{ ...defaultTabState }],
    };
    const idx = paneIndex ?? project.activePaneIndex;

    // Auto-close split when clearing all tabs
    if (project.panes.length > 1) {
      const newPanes = [...project.panes];
      newPanes.splice(idx, 1);
      tabs.set(projectId, {
        ...project,
        panes: newPanes,
        activePaneIndex: 0,
      });
    } else {
      const newPanes = [...project.panes];
      newPanes[idx] = { ...defaultTabState };
      tabs.set(projectId, { ...project, panes: newPanes });
    }

    set({ tabs });
  },

  closeAllTabsAllPanes: (projectId) => {
    const tabs = new Map(get().tabs);
    tabs.set(projectId, {
      panes: [{ ...defaultTabState }],
      activePaneIndex: 0,
      openExtensions: [],
      activeExtensionId: null,
    });
    set({ tabs });
  },

  setActiveTab: (projectId, fileId, paneIndex?) => {
    const tabs = new Map(get().tabs);
    const project = tabs.get(projectId) ?? {
      ...defaultProjectState,
      panes: [{ ...defaultTabState }],
    };
    const idx = paneIndex ?? project.activePaneIndex;
    const state = project.panes[idx] ?? defaultTabState;

    const newPanes = [...project.panes];
    newPanes[idx] = { ...state, activeTabId: fileId };
    tabs.set(projectId, { ...project, panes: newPanes, activeExtensionId: null });
    set({ tabs });
  },

  reorderTab: (projectId, fromIndex, toIndex, paneIndex?) => {
    const tabs = new Map(get().tabs);
    const project = tabs.get(projectId) ?? {
      ...defaultProjectState,
      panes: [{ ...defaultTabState }],
    };
    const idx = paneIndex ?? project.activePaneIndex;
    const state = project.panes[idx] ?? defaultTabState;
    const openTabs = [...state.openTabs];

    if (
      fromIndex < 0 ||
      fromIndex >= openTabs.length ||
      toIndex < 0 ||
      toIndex >= openTabs.length ||
      fromIndex === toIndex
    ) {
      return;
    }

    const [moved] = openTabs.splice(fromIndex, 1);
    openTabs.splice(toIndex, 0, moved);

    const newPanes = [...project.panes];
    newPanes[idx] = { ...state, openTabs };
    tabs.set(projectId, { ...project, panes: newPanes });
    set({ tabs });
  },

  splitEditor: (projectId, fileId?) => {
    const tabs = new Map(get().tabs);
    const project = tabs.get(projectId) ?? {
      ...defaultProjectState,
      panes: [{ ...defaultTabState }],
    };

    // Already split — don't add more panes
    if (project.panes.length >= 2) return;

    const activePane = project.panes[project.activePaneIndex] ?? defaultTabState;
    const newFileId = fileId ?? activePane.activeTabId;

    const newPane: TabState = newFileId
      ? {
          openTabs: [newFileId],
          activeTabId: newFileId,
          previewTabId: null,
        }
      : { ...defaultTabState };

    tabs.set(projectId, {
      ...project,
      panes: [...project.panes, newPane],
      activePaneIndex: 1,
    });
    set({ tabs });
  },

  closeSplit: (projectId, paneIndex) => {
    const tabs = new Map(get().tabs);
    const project = tabs.get(projectId) ?? {
      ...defaultProjectState,
      panes: [{ ...defaultTabState }],
    };

    if (project.panes.length <= 1) return;

    const newPanes = [...project.panes];
    newPanes.splice(paneIndex, 1);

    tabs.set(projectId, {
      ...project,
      panes: newPanes,
      activePaneIndex: 0,
    });
    set({ tabs });
  },

  setActivePane: (projectId, paneIndex) => {
    const tabs = new Map(get().tabs);
    const project = tabs.get(projectId) ?? {
      ...defaultProjectState,
      panes: [{ ...defaultTabState }],
    };

    if (paneIndex < 0 || paneIndex >= project.panes.length) return;

    tabs.set(projectId, { ...project, activePaneIndex: paneIndex });
    set({ tabs });
  },

  triggerSaveAll: () => {
    set((state) => ({ saveAllSignal: state.saveAllSignal + 1 }));
  },

  openExtensionTab: (projectId, extension) => {
    const tabs = new Map(get().tabs);
    const project = tabs.get(projectId) ?? {
      ...defaultProjectState,
      panes: [{ ...defaultTabState }],
    };
    const alreadyOpen = project.openExtensions.some(
      (e) => e._id === extension._id
    );
    const openExtensions = alreadyOpen
      ? project.openExtensions
      : [...project.openExtensions, extension];
    tabs.set(projectId, {
      ...project,
      openExtensions,
      activeExtensionId: extension._id,
    });
    set({ tabs });
  },

  closeExtensionTab: (projectId, extensionId) => {
    const tabs = new Map(get().tabs);
    const project = tabs.get(projectId) ?? {
      ...defaultProjectState,
      panes: [{ ...defaultTabState }],
    };
    const openExtensions = project.openExtensions.filter(
      (e) => e._id !== extensionId
    );
    const activeExtensionId =
      project.activeExtensionId === extensionId
        ? null
        : project.activeExtensionId;
    tabs.set(projectId, { ...project, openExtensions, activeExtensionId });
    set({ tabs });
  },

  setActiveExtensionTab: (projectId, extensionId) => {
    const tabs = new Map(get().tabs);
    const project = tabs.get(projectId) ?? {
      ...defaultProjectState,
      panes: [{ ...defaultTabState }],
    };
    tabs.set(projectId, { ...project, activeExtensionId: extensionId });
    set({ tabs });
  },

  clearActiveExtension: (projectId) => {
    const tabs = new Map(get().tabs);
    const project = tabs.get(projectId) ?? {
      ...defaultProjectState,
      panes: [{ ...defaultTabState }],
    };
    tabs.set(projectId, { ...project, activeExtensionId: null });
    set({ tabs });
  },

  reorderExtensionTab: (projectId, fromIndex, toIndex) => {
    const tabs = new Map(get().tabs);
    const project = tabs.get(projectId) ?? {
      ...defaultProjectState,
      panes: [{ ...defaultTabState }],
    };
    const openExtensions = [...project.openExtensions];

    if (
      fromIndex < 0 ||
      fromIndex >= openExtensions.length ||
      toIndex < 0 ||
      toIndex >= openExtensions.length ||
      fromIndex === toIndex
    ) {
      return;
    }

    const [moved] = openExtensions.splice(fromIndex, 1);
    openExtensions.splice(toIndex, 0, moved);

    tabs.set(projectId, { ...project, openExtensions });
    set({ tabs });
  },
}));
