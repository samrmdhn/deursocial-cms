import { create } from 'zustand';

interface SidebarState {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebar: (collapsed: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()((set) => ({
  isCollapsed: false,
  toggleSidebar: () => set((s) => ({ isCollapsed: !s.isCollapsed })),
  setSidebar: (collapsed) => set({ isCollapsed: collapsed }),
}));
