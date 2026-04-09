import {
  STORAGE_PREFIX,
  GLOBAL_KEYS,
  GLOBAL_KEY_PREFIXES,
} from "../constants";

let _activeDate = "";

/**
 * One-time migration: move existing global sticky note bodies to today's
 * date-scoped storage so they appear on the current day after the switch
 * from global to daily-scoped sticky notes.
 */
export function migrateStickyToDaily() {
  const flag = localStorage.getItem(STORAGE_PREFIX + "sticky-daily-migrated");
  if (flag) return;

  const today = _activeDate || new Date().toISOString().slice(0, 10);
  const keysToMigrate: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes(":block-global:sticky-") && key.endsWith(":body")) {
      keysToMigrate.push(key);
    }
  }

  for (const key of keysToMigrate) {
    const value = localStorage.getItem(key);
    if (!value || !value.trim()) continue;
    const match = key.match(/:block-global:(sticky-[^:]+):body$/);
    if (!match) continue;
    const blockId = match[1];
    const newKey = STORAGE_PREFIX + "session:" + today + ":" + blockId + ":body";
    if (!localStorage.getItem(newKey)) {
      localStorage.setItem(newKey, value);
    }
  }

  localStorage.setItem(STORAGE_PREFIX + "sticky-daily-migrated", "1");
}

export function setActiveDate(date: string) {
  _activeDate = date;
}

export function storageKey(key: string, date?: string): string {
  if (GLOBAL_KEYS.has(key)) return STORAGE_PREFIX + key;
  if (GLOBAL_KEY_PREFIXES.some((p) => key.startsWith(p)))
    return STORAGE_PREFIX + key;
  return STORAGE_PREFIX + "session:" + (date ?? _activeDate) + ":" + key;
}

export function loadJSON<T>(key: string, fallback: T, date?: string): T {
  try {
    const raw = localStorage.getItem(storageKey(key, date));
    const parsed = raw ? JSON.parse(raw) : fallback;
    return (parsed ?? fallback) as T; // JW-23: catch JSON.parse("null") → null
  } catch {
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown, date?: string): boolean {
  try {
    localStorage.setItem(storageKey(key, date), JSON.stringify(value));
    return true;
  } catch (e) {
    console.error("[storage] 寫入失敗:", key, e);
    return false;
  }
}

export function loadText(key: string, fallback = "", date?: string): string {
  return localStorage.getItem(storageKey(key, date)) ?? fallback;
}

export function saveText(key: string, value: string, date?: string): boolean {
  try {
    localStorage.setItem(storageKey(key, date), value);
    return true;
  } catch (e) {
    console.error("[storage] 寫入失敗:", key, e);
    return false;
  }
}

/**
 * Read a block field directly for a specific date without touching _activeDate.
 * Used by DatePeekModal to display past-day content without navigating there.
 */
export function loadFieldForDate(
  date: string,
  blockId: string,
  fieldKey: string
): string {
  const fullKey = STORAGE_PREFIX + "session:" + date + ":" + blockId + ":" + fieldKey;
  return localStorage.getItem(fullKey) ?? "";
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
