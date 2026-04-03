import { create } from "zustand";
import { loadJSON, saveJSON } from "../utils/storage";
import type { Block } from "../types";

interface BlockStore {
  blocks: Block[];
  zCounter: number;
  setBlocks: (blocks: Block[]) => void;
  addBlock: (block: Block) => void;
  updateBlock: (id: string, delta: Partial<Block>) => void;
  removeBlock: (id: string) => void;
  archiveBlock: (id: string) => void;
  restoreBlock: (id: string) => void;
  bringToFront: (id: string) => void;
}

const defaultBlocks: Block[] = [];

function getInitialZCounter(blocks: Block[]): number {
  return Math.max(10, ...blocks.map((b) => b.z));
}

export const useBlockStore = create<BlockStore>((set) => {
  const blocks = loadJSON<Block[]>("blocks", defaultBlocks);
  const initialZCounter = getInitialZCounter(blocks);

  return {
    blocks,
    zCounter: initialZCounter,

    setBlocks: (blocks) => {
      saveJSON("blocks", blocks);
      set({ blocks });
    },

    addBlock: (block) =>
      set((s) => {
        const blocks = [...s.blocks, block];
        saveJSON("blocks", blocks);
        return { blocks };
      }),

    updateBlock: (id, delta) =>
      set((s) => {
        const blocks = s.blocks.map((b) =>
          b.id === id ? { ...b, ...delta } : b
        );
        saveJSON("blocks", blocks);
        return { blocks };
      }),

    removeBlock: (id) =>
      set((s) => {
        const blocks = s.blocks.filter((b) => b.id !== id);
        saveJSON("blocks", blocks);
        return { blocks };
      }),

    archiveBlock: (id) =>
      set((s) => {
        const blocks = s.blocks.map((b) =>
          b.id === id ? { ...b, archived: true } : b
        );
        saveJSON("blocks", blocks);
        return { blocks };
      }),

    restoreBlock: (id) =>
      set((s) => {
        const blocks = s.blocks.map((b) =>
          b.id === id ? { ...b, archived: false } : b
        );
        saveJSON("blocks", blocks);
        return { blocks };
      }),

    bringToFront: (id) =>
      set((s) => {
        const newZCounter = s.zCounter + 1;
        const blocks = s.blocks.map((b) =>
          b.id === id ? { ...b, z: newZCounter } : b
        );
        saveJSON("blocks", blocks);
        return { blocks, zCounter: newZCounter };
      }),
  };
});
