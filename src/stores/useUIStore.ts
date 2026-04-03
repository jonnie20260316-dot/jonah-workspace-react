import { create } from "zustand";

interface UIStore {
  sidebarOpen: boolean;
  gearMenuOpen: boolean;
  toggleSidebar: () => void;
  toggleGearMenu: () => void;
  closeSidebar: () => void;
  closeGearMenu: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: false,
  gearMenuOpen: false,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen, gearMenuOpen: false })),
  toggleGearMenu: () => set((s) => ({ gearMenuOpen: !s.gearMenuOpen, sidebarOpen: false })),
  closeSidebar: () => set({ sidebarOpen: false }),
  closeGearMenu: () => set({ gearMenuOpen: false }),
}));
