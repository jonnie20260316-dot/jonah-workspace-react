import { STORAGE_PREFIX, GLOBAL_KEYS, GLOBAL_KEY_PREFIXES } from "../constants";
import { loadText, saveText } from "./storage";
import type { SyncCategory, SyncPayload } from "../types";

// ─── Device identity ─────────────────────────────────────────────────────────

export function getOrCreateDeviceId(): string {
  const existing = loadText("device-id");
  if (existing) return existing;
  const id = crypto.randomUUID();
  saveText("device-id", id);
  return id;
}

// ─── Sync categories (8) ─────────────────────────────────────────────────────

export const SYNC_CATEGORIES: SyncCategory[] = [
  {
    id: "canvas",
    zhLabel: "畫布排版",
    enLabel: "Canvas Layout",
    globalKeys: ["blocks", "viewport", "board-size"],
    globalKeyPrefixes: [],
  },
  {
    id: "projects",
    zhLabel: "專案看板",
    enLabel: "Project Board",
    globalKeys: ["project-board"],
    globalKeyPrefixes: [],
  },
  {
    id: "notes",
    zhLabel: "日常筆記",
    enLabel: "Daily Notes",
    globalKeys: [],
    globalKeyPrefixes: ["session:"],
  },
  {
    id: "timer",
    zhLabel: "計時器",
    enLabel: "Timer",
    globalKeys: [
      "timer-state",
      "timer-base-minutes",
      "timer-settings",
      "timer-daily-target",
      "timer-sound",
    ],
    globalKeyPrefixes: ["timer-sessions:", "timer-sounds:"],
  },
  {
    id: "intel",
    zhLabel: "帳戶分析",
    enLabel: "Account Analysis",
    globalKeys: [
      "threads-intel-records",
      "threads-intel-archived",
      "threads-intel-archive-days",
    ],
    globalKeyPrefixes: [],
  },
  {
    id: "prompted",
    zhLabel: "提示筆記",
    enLabel: "Prompted Notes",
    globalKeys: [],
    globalKeyPrefixes: ["prompted-notes-config:", "prompted-notes-entries:"],
  },
  {
    id: "content",
    zhLabel: "音樂與內容",
    enLabel: "Music & Content",
    globalKeys: [],
    globalKeyPrefixes: ["spotify-presets:", "spotify-ui:", "content-draft-history:"],
  },
  {
    id: "prefs",
    zhLabel: "偏好設定",
    enLabel: "Preferences",
    globalKeys: ["lang", "snap", "overlap", "history-compact", "sidebar-category-order"],
    globalKeyPrefixes: [],
  },
];

// ─── Payload building ─────────────────────────────────────────────────────────

/**
 * Reads all GLOBAL_KEYS + GLOBAL_KEY_PREFIXES from localStorage and builds
 * a sync envelope. Returns raw string values (as stored) to preserve exact state.
 */
export function buildSyncPayload(deviceId: string, pushCount: number): SyncPayload {
  const data: Record<string, string> = {};
  const prefix = STORAGE_PREFIX;

  for (let i = 0; i < localStorage.length; i++) {
    const fullKey = localStorage.key(i);
    if (!fullKey?.startsWith(prefix)) continue;
    const key = fullKey.slice(prefix.length);

    const isGlobal = GLOBAL_KEYS.has(key);
    const isDynamic = GLOBAL_KEY_PREFIXES.some((p) => key.startsWith(p));
    const isSession = key.startsWith("session:");

    if (isGlobal || isDynamic || isSession) {
      const val = localStorage.getItem(fullKey);
      if (val !== null) data[key] = val;
    }
  }

  // Parse blocks to get blockCount
  let blockCount = 0;
  try {
    const raw = data["blocks"];
    if (raw) blockCount = (JSON.parse(raw) as unknown[]).length;
  } catch {
    // fine
  }

  return {
    syncFormatVersion: 1,
    pushedAt: new Date().toISOString(),
    deviceId,
    pushCount,
    blockCount,
    data,
  };
}

/**
 * Filter payload to only include keys belonging to the selected category IDs.
 * Always preserves sync-meta and device-id even if not in selectedIds.
 */
export function filterPayloadForSync(
  payload: SyncPayload,
  selectedIds: string[]
): SyncPayload {
  const selectedCats = SYNC_CATEGORIES.filter((c) => selectedIds.includes(c.id));

  const allowedKeys = new Set<string>(["sync-meta", "device-id"]);
  const allowedPrefixes: string[] = [];

  for (const cat of selectedCats) {
    for (const k of cat.globalKeys) allowedKeys.add(k);
    for (const p of cat.globalKeyPrefixes) allowedPrefixes.push(p);
  }

  const filtered: Record<string, string> = {};
  for (const [key, val] of Object.entries(payload.data)) {
    if (allowedKeys.has(key)) { filtered[key] = val; continue; }
    if (allowedPrefixes.some((p) => key.startsWith(p))) { filtered[key] = val; }
  }

  return { ...payload, data: filtered };
}

/**
 * Write all keys from payload.data back to localStorage.
 * Calling code must trigger store rehydration after this.
 */
export function applySyncPayload(payload: SyncPayload): void {
  const prefix = STORAGE_PREFIX;
  for (const [key, val] of Object.entries(payload.data)) {
    localStorage.setItem(prefix + key, val);
  }
}

// ─── Filename ─────────────────────────────────────────────────────────────────

export const SYNC_FILENAME = "jonah-workspace-sync.json";
