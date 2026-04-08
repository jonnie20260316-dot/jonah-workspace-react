import { create } from "zustand";
import { loadJSON, saveJSON } from "../utils/storage";
import type { TimerState, TimerSettings, TimerSession } from "../types";

interface TimerStore {
  timerState: TimerState;
  timerSettings: TimerSettings;
  sessions: TimerSession[];
  setTimerState: (s: TimerState) => void;
  setTimerSettings: (s: TimerSettings) => void;
  loadSessions: (date: string) => void;
  logSession: (session: Omit<TimerSession, "id">) => void;
  deleteSession: (id: string, date: string) => void;
  updateSession: (id: string, date: string, delta: Partial<Pick<TimerSession, "task" | "duration" | "actual">>) => void;
}

export const useTimerStore = create<TimerStore>((set) => ({
  timerState: loadJSON<TimerState>("timer-state", {
    duration: 90 * 60,
    remaining: 90 * 60,
    running: false,
    overtime: 0,
    wallStartedAt: null,
    mode: "work",
  }),

  timerSettings: loadJSON<TimerSettings>("timer-settings", {
    dailyTarget: 240,
    autoOvertime: true,
    showNotification: true,
    selectedSound: "__bell__",
  }),

  sessions: [],

  setTimerState: (timerState) => {
    saveJSON("timer-state", timerState);
    set({ timerState });
  },

  setTimerSettings: (timerSettings) => {
    saveJSON("timer-settings", timerSettings);
    set({ timerSettings });
  },

  loadSessions: (date: string) => {
    const sessions = loadJSON<TimerSession[]>(`timer-sessions:${date}`, []);
    set({ sessions: sessions ?? [] });
  },

  logSession: (partial) => {
    const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const session: TimerSession = { ...partial, id };
    // Derive date from endedAt ISO string
    const date = session.endedAt.slice(0, 10);
    const existing = loadJSON<TimerSession[]>(`timer-sessions:${date}`, []) ?? [];
    const updated = [...existing, session];
    saveJSON(`timer-sessions:${date}`, updated);
    // Update reactive state if the date is currently loaded
    set((state) => {
      const currentDate = state.sessions.length > 0
        ? state.sessions[0]?.endedAt?.slice(0, 10)
        : null;
      if (!currentDate || currentDate === date) {
        return { sessions: updated };
      }
      return {};
    });
  },

  deleteSession: (id: string, date: string) => {
    const existing = loadJSON<TimerSession[]>(`timer-sessions:${date}`, []) ?? [];
    const updated = existing.filter((s) => s.id !== id);
    saveJSON(`timer-sessions:${date}`, updated);
    set({ sessions: updated });
  },

  updateSession: (id: string, date: string, delta) => {
    const existing = loadJSON<TimerSession[]>(`timer-sessions:${date}`, []) ?? [];
    const updated = existing.map((s) => s.id === id ? { ...s, ...delta } : s);
    saveJSON(`timer-sessions:${date}`, updated);
    set({ sessions: updated });
  },
}));
