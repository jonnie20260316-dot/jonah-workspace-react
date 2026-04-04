import { create } from "zustand";
import { loadJSON, saveJSON } from "../utils/storage";
import { scheduleGitSync } from "../utils/sync";
import type { SurfaceElement } from "../types";

interface SurfaceStore {
  elements: SurfaceElement[];
  addElement:    (el: SurfaceElement) => void;
  updateElement: (id: string, delta: Partial<SurfaceElement>) => void;
  removeElement: (id: string) => void;
  removeElements: (ids: string[]) => void;
  setElements:   (els: SurfaceElement[]) => void;
}

export const useSurfaceStore = create<SurfaceStore>((set, get) => ({
  elements: loadJSON<SurfaceElement[]>("surface-elements", []),

  addElement: (el) => {
    const elements = [...get().elements, el];
    set({ elements });
    saveJSON("surface-elements", elements);
    scheduleGitSync();
  },

  updateElement: (id, delta) => {
    const elements = get().elements.map((el) =>
      el.id === id ? { ...el, ...delta } : el
    );
    set({ elements });
    saveJSON("surface-elements", elements);
    scheduleGitSync();
  },

  removeElement: (id) => {
    const elements = get().elements.filter((el) => el.id !== id);
    set({ elements });
    saveJSON("surface-elements", elements);
    scheduleGitSync();
  },

  removeElements: (ids) => {
    const idSet = new Set(ids);
    const elements = get().elements.filter((el) => !idSet.has(el.id));
    set({ elements });
    saveJSON("surface-elements", elements);
    scheduleGitSync();
  },

  setElements: (elements) => {
    set({ elements });
    saveJSON("surface-elements", elements);
    scheduleGitSync();
  },
}));
