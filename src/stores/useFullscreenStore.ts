import { create } from "zustand";

export type FSModule = "dashboard" | "brain" | "lab";

interface FullscreenStore {
  isOpen: boolean;
  activeModule: FSModule;
  open: (module: FSModule) => void;
  close: () => void;
  setModule: (module: FSModule) => void;
}

export const useFullscreenStore = create<FullscreenStore>((set) => ({
  isOpen: false,
  activeModule: "dashboard",
  open: (module) => set({ isOpen: true, activeModule: module }),
  close: () => set({ isOpen: false }),
  setModule: (module) => set({ activeModule: module }),
}));
