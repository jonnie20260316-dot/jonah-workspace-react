import { create } from "zustand";
import { loadJSON, saveJSON } from "../utils/storage";

export interface ProjectCard {
  id: string;
  text: string;
  description: string;
  steps: string[];
  checks: string;
  tags: string[];
}

export interface ProjectBoard {
  queue: ProjectCard[];
  doing: ProjectCard[];
  archive: ProjectCard[];
}

function normBoard(raw: Record<string, unknown>): ProjectBoard {
  const board: ProjectBoard = { queue: [], doing: [], archive: [] };
  for (const col of ["queue", "doing", "archive"] as const) {
    const arr = Array.isArray(raw[col]) ? (raw[col] as ProjectCard[]) : [];
    board[col] = arr.map((c) => ({
      ...{ tags: [] as string[], description: "", steps: [] as string[], checks: "" },
      ...c,
    }));
  }
  return board;
}

interface ProjectStore {
  projectBoard: ProjectBoard;
  setProjectBoard: (board: ProjectBoard) => void;
  addCard: (column: keyof ProjectBoard, card: ProjectCard) => void;
  moveCard: (cardId: string, fromCol: keyof ProjectBoard, toCol: keyof ProjectBoard) => void;
  deleteCard: (cardId: string) => void;
  updateCard: (cardId: string, delta: Partial<ProjectCard>) => void;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projectBoard: normBoard(loadJSON<Record<string, unknown>>("project-board", {})),

  setProjectBoard: (projectBoard) => {
    saveJSON("project-board", projectBoard);
    set({ projectBoard });
  },

  addCard: (column, card) => {
    const board = { ...get().projectBoard };
    board[column] = [...board[column], card];
    saveJSON("project-board", board);
    set({ projectBoard: board });
  },

  moveCard: (cardId, fromCol, toCol) => {
    if (fromCol === toCol) return;
    const board = { ...get().projectBoard };
    const fromCards = [...board[fromCol]];
    const idx = fromCards.findIndex((c) => c.id === cardId);
    if (idx < 0) return;
    const [card] = fromCards.splice(idx, 1);
    board[fromCol] = fromCards;
    board[toCol] = [...board[toCol], card];
    saveJSON("project-board", board);
    set({ projectBoard: board });
  },

  deleteCard: (cardId) => {
    const board = { ...get().projectBoard };
    for (const col of ["queue", "doing", "archive"] as const) {
      board[col] = board[col].filter((c) => c.id !== cardId);
    }
    saveJSON("project-board", board);
    set({ projectBoard: board });
  },

  updateCard: (cardId, delta) => {
    const board = { ...get().projectBoard };
    for (const col of ["queue", "doing", "archive"] as const) {
      board[col] = board[col].map((c) =>
        c.id === cardId ? { ...c, ...delta } : c
      );
    }
    saveJSON("project-board", board);
    set({ projectBoard: board });
  },
}));
