import {
  STORAGE_PREFIX,
  GLOBAL_KEYS,
  GLOBAL_KEY_PREFIXES,
} from "../constants";

let _activeDate = "";

export function setActiveDate(date: string) {
  _activeDate = date;
}

export function storageKey(key: string): string {
  if (GLOBAL_KEYS.has(key)) return STORAGE_PREFIX + key;
  if (GLOBAL_KEY_PREFIXES.some((p) => key.startsWith(p)))
    return STORAGE_PREFIX + key;
  return STORAGE_PREFIX + "session:" + _activeDate + ":" + key;
}

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(storageKey(key));
    const parsed = raw ? JSON.parse(raw) : fallback;
    return (parsed ?? fallback) as T; // JW-23: catch JSON.parse("null") → null
  } catch {
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown): void {
  localStorage.setItem(storageKey(key), JSON.stringify(value));
}

export function loadText(key: string, fallback = ""): string {
  return localStorage.getItem(storageKey(key)) ?? fallback;
}

export function saveText(key: string, value: string): void {
  localStorage.setItem(storageKey(key), value);
}
