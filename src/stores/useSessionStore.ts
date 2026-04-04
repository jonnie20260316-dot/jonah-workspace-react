import { create } from "zustand";
import { loadText, saveText, setActiveDate as storageSetActiveDate } from "../utils/storage";
import { setLang } from "../utils/i18n";
import { scheduleGitSync } from "../utils/sync";
import { DEFAULT_LANG } from "../constants";
import type { Lang } from "../types";

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function offsetDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface SessionStore {
  activeDate: string;
  lang: Lang;
  snapMode: boolean;
  overlapMode: boolean;
  textScale: number;
  setLang: (l: Lang) => void;
  setSnapMode: (v: boolean) => void;
  setOverlapMode: (v: boolean) => void;
  setTextScale: (v: number) => void;
  setActiveDate: (date: string) => void;
  navigateDate: (offset: number) => void;
}

const initialDate = loadText("active-date") || todayString();
storageSetActiveDate(initialDate);

const initialLang = (loadText("lang") || DEFAULT_LANG) as Lang;
setLang(initialLang);

const initialTextScale = parseFloat(loadText("text-scale") || "1") || 1;
document.documentElement.style.setProperty("--text-scale", String(initialTextScale));

export const useSessionStore = create<SessionStore>((set, get) => ({
  activeDate: initialDate,
  lang: initialLang,
  snapMode: loadText("snap", "true") === "true",
  overlapMode: loadText("overlap", "true") === "true",
  textScale: initialTextScale,

  setLang: (lang) => {
    saveText("lang", lang);
    setLang(lang);
    set({ lang });
  },

  setSnapMode: (v) => {
    saveText("snap", String(v));
    set({ snapMode: v });
  },

  setOverlapMode: (v) => {
    saveText("overlap", String(v));
    set({ overlapMode: v });
  },

  setTextScale: (v) => {
    saveText("text-scale", String(v));
    document.documentElement.style.setProperty("--text-scale", String(v));
    set({ textScale: v });
  },

  setActiveDate: (date) => {
    saveText("active-date", date);
    storageSetActiveDate(date);
    set({ activeDate: date });
    scheduleGitSync();
  },

  navigateDate: (offset) => {
    const next = offsetDate(get().activeDate, offset);
    get().setActiveDate(next);
  },
}));
