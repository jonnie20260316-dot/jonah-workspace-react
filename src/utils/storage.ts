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

/**
 * Serialize all global keys from localStorage to a JSON string and send to
 * Electron's file-system backup. Call before quit or on manual save.
 * No-op in browser (no electronAPI).
 */
export async function backupToFile(): Promise<void> {
  if (!window.electronAPI?.backupStorage) return;
  const snapshot: Record<string, string> = {};
  for (const key of GLOBAL_KEYS) {
    const full = STORAGE_PREFIX + key;
    const val = localStorage.getItem(full);
    if (val !== null) snapshot[full] = val;
  }
  for (const prefix of GLOBAL_KEY_PREFIXES) {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX + prefix)) {
        snapshot[k] = localStorage.getItem(k)!;
      }
    }
  }
  await window.electronAPI.backupStorage(JSON.stringify(snapshot));
}

/**
 * Restore all keys from the file backup into localStorage, then return true
 * if any data was restored. Call on boot if localStorage appears empty.
 */
export async function restoreFromFile(): Promise<boolean> {
  if (!window.electronAPI?.restoreStorage) return false;
  const result = await window.electronAPI.restoreStorage();
  if (!result.ok || !result.data) return false;
  try {
    const snapshot = JSON.parse(result.data) as Record<string, string>;
    for (const [k, v] of Object.entries(snapshot)) {
      localStorage.setItem(k, v);
    }
    return Object.keys(snapshot).length > 0;
  } catch {
    return false;
  }
}
