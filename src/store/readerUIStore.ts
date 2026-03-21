import { create } from 'zustand';

export type SidebarTab = 'toc' | 'annotations';

interface ReaderUIState {
  isSidebarVisible: boolean;
  isSidebarPinned: boolean;
  sidebarActiveTab: SidebarTab;
  sidebarWidth: number;
  isBarsHovered: boolean;
}

interface ReaderUIActions {
  setSidebarVisible: (visible: boolean) => void;
  toggleSidebar: () => void;
  setSidebarPinned: (pinned: boolean) => void;
  toggleSidebarPinned: () => void;
  setActiveTab: (tab: SidebarTab) => void;
  setSidebarWidth: (width: number) => void;
  setBarsHovered: (hovered: boolean) => void;
}

export const useReaderUIStore = create<ReaderUIState & ReaderUIActions>((set) => ({
  isSidebarVisible: false,
  isSidebarPinned: false,
  sidebarActiveTab: 'toc',
  sidebarWidth: 256,
  isBarsHovered: false,

  setSidebarVisible: (visible) => set({ isSidebarVisible: visible }),
  toggleSidebar: () => set((s) => ({ isSidebarVisible: !s.isSidebarVisible })),
  setSidebarPinned: (pinned) => set({ isSidebarPinned: pinned }),
  toggleSidebarPinned: () => set((s) => ({ isSidebarPinned: !s.isSidebarPinned })),
  setActiveTab: (tab) => set({ sidebarActiveTab: tab }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setBarsHovered: (hovered) => set({ isBarsHovered: hovered }),
}));
