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

// ─── Git sync (Electron-only) ─────────────────────────────────────────────────

/** Git commit + push with error detection. Returns { ok, error?, authError? } */
export async function gitCommitAndPush(
  dirPath: string
): Promise<{ ok: boolean; error?: string; authError?: boolean }> {
  const api = window.electronAPI;
  if (!api) return { ok: false, error: "Not in Electron" };

  try {
    // Commit
    const commitResult = await api.gitCommit(dirPath);
    if (!commitResult.ok) {
      return { ok: false, error: commitResult.stderr };
    }
    if (commitResult.nothingToCommit) {
      return { ok: true };
    }

    // Push
    const pushResult = await api.gitPush(dirPath);
    if (!pushResult.ok) {
      // Detect auth errors
      const isAuthError =
        pushResult.stderr.includes("Authentication failed") ||
        pushResult.stderr.includes("Permission denied") ||
        pushResult.stderr.includes("remote: Invalid username");
      return { ok: false, error: pushResult.stderr, authError: isAuthError };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/** Git pull + apply payload. Returns { ok, hadChanges, error? } */
export async function gitPullAndApply(
  dirPath: string
): Promise<{ ok: boolean; hadChanges: boolean; error?: string }> {
  const api = window.electronAPI;
  if (!api) return { ok: false, hadChanges: false, error: "Not in Electron" };

  try {
    // Pull
    const pullResult = await api.gitPull(dirPath);
    if (!pullResult.ok) {
      return { ok: false, hadChanges: false, error: pullResult.stderr };
    }

    if (!pullResult.hadChanges) {
      return { ok: true, hadChanges: false };
    }

    // Read the updated sync file
    const text = await api.readFile(dirPath, SYNC_FILENAME);
    if (!text) {
      return { ok: false, hadChanges: false, error: "Could not read sync file after pull" };
    }

    const payload = JSON.parse(text) as SyncPayload;
    applySyncPayload(payload);

    return { ok: true, hadChanges: true };
  } catch (err) {
    return { ok: false, hadChanges: false, error: (err as Error).message };
  }
}

// ─── Git debounce scheduling ─────────────────────────────────────────────────

let gitDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let useSyncStoreRef: any = null;

/**
 * Register the useSyncStore so scheduleGitSync can access it.
 * Called from useSyncStore initialization.
 */
export function setUseSyncStoreRef(store: any): void {
  useSyncStoreRef = store;
}

/**
 * Schedule a debounced git sync (30s delay).
 * Cancels previous timer if one exists.
 * Imported and called by stores when meaningful changes occur.
 */
export function scheduleGitSync(): void {
  if (!useSyncStoreRef) return;

  const { gitEnabled, gitDir } = useSyncStoreRef.getState();
  if (!gitEnabled || !gitDir) return;

  if (gitDebounceTimer !== null) {
    clearTimeout(gitDebounceTimer);
  }

  gitDebounceTimer = setTimeout(() => {
    gitDebounceTimer = null;
    const { gitSyncNow } = useSyncStoreRef.getState();
    gitSyncNow().catch((err: Error) => console.error("[git] auto-sync failed:", err));
  }, 30_000);
}
