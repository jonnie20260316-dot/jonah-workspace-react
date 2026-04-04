import { create } from "zustand";
import { UNDO_LIMIT } from "../constants";
import type { Block } from "../types";
import type { SurfaceElement } from "../types";

export interface Snapshot {
  blocks: Block[];
  elements: SurfaceElement[];
}

interface HistoryStore {
  past: Snapshot[];
  future: Snapshot[];
  push: (snapshot: Snapshot) => void;
  undo: (current: Snapshot) => Snapshot | null;
  redo: (current: Snapshot) => Snapshot | null;
  canUndo: boolean;
  canRedo: boolean;
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  past: [],
  future: [],

  push: (snapshot: Snapshot) => {
    set((s) => {
      // Trim past to UNDO_LIMIT, keeping only the most recent entries
      const newPast = [...s.past, snapshot].slice(-(UNDO_LIMIT));
      return {
        past: newPast,
        future: [], // clear redo stack on new action
      };
    });
  },

  undo: (current: Snapshot) => {
    const { past } = get();
    if (!past.length) return null;

    const prev = past[past.length - 1];
    set((s) => ({
      past: s.past.slice(0, -1),
      future: [current, ...s.future],
    }));
    return prev;
  },

  redo: (current: Snapshot) => {
    const { future } = get();
    if (!future.length) return null;

    const next = future[0];
    set((s) => ({
      past: [...s.past, current],
      future: s.future.slice(1),
    }));
    return next;
  },

  get canUndo() {
    return get().past.length > 0;
  },

  get canRedo() {
    return get().future.length > 0;
  },
}));
