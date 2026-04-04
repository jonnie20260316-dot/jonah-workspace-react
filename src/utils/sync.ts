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

// ─── GitHub REST API sync (Electron-only) ────────────────────────────────────

/** Parse "https://github.com/owner/repo.git" or "owner/repo" → { owner, repo } | null */
export function parseGithubRepo(input: string): { owner: string; repo: string } | null {
  const urlMatch = input.match(/github\.com[/:]([\w.-]+)\/([\w.-]+)/);
  if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2].replace(/\.git$/, "") };
  const shortMatch = input.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (shortMatch) return { owner: shortMatch[1], repo: shortMatch[2].replace(/\.git$/, "") };
  return null;
}

/**
 * Push: build payload, PUT to GitHub Contents API.
 * Gets current SHA first (needed for update vs create).
 */
export async function githubPush(
  token: string,
  owner: string,
  repo: string,
  deviceId: string,
  pushCount: number
): Promise<{ ok: boolean; error?: string }> {
  const api = window.electronAPI;
  if (!api) return { ok: false, error: "Not in Electron" };

  try {
    const getResult = await api.githubGetFile(token, owner, repo, SYNC_FILENAME);
    if (!getResult.ok) return { ok: false, error: getResult.error };

    const sha = getResult.exists && getResult.sha ? getResult.sha : undefined;
    const payload = buildSyncPayload(deviceId, pushCount);
    const content = JSON.stringify(payload, null, 2);

    return api.githubPutFile(token, owner, repo, SYNC_FILENAME, content, sha);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/**
 * Pull: GET from GitHub Contents API, apply payload to localStorage.
 * Returns the payload so the caller can inspect deviceId and skip unnecessary rehydration.
 */
export async function githubPull(
  token: string,
  owner: string,
  repo: string
): Promise<{ ok: boolean; hadChanges: boolean; payload?: SyncPayload; error?: string }> {
  const api = window.electronAPI;
  if (!api) return { ok: false, hadChanges: false, error: "Not in Electron" };

  try {
    const getResult = await api.githubGetFile(token, owner, repo, SYNC_FILENAME);
    if (!getResult.ok) return { ok: false, hadChanges: false, error: getResult.error };
    if (!getResult.exists || !getResult.content) return { ok: true, hadChanges: false };

    const payload = JSON.parse(getResult.content) as SyncPayload;
    applySyncPayload(payload);
    return { ok: true, hadChanges: true, payload };
  } catch (err) {
    return { ok: false, hadChanges: false, error: (err as Error).message };
  }
}

// ─── Auto-sync debounce scheduling ───────────────────────────────────────────

let githubDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let useSyncStoreRef: any = null;

export function setUseSyncStoreRef(store: any): void {
  useSyncStoreRef = store;
}

/**
 * Schedule a debounced GitHub sync (30s delay).
 * Called by block/session stores on meaningful mutations.
 * Function kept as scheduleGitSync for import compatibility.
 */
export function scheduleGitSync(): void {
  if (!useSyncStoreRef) return;

  const { githubEnabled, githubToken, githubRepo } = useSyncStoreRef.getState();
  if (!githubEnabled || !githubToken || !githubRepo) return;

  if (githubDebounceTimer !== null) clearTimeout(githubDebounceTimer);

  githubDebounceTimer = setTimeout(() => {
    githubDebounceTimer = null;
    useSyncStoreRef.getState().githubSyncNow().catch((err: Error) =>
      console.error("[github] auto-sync failed:", err)
    );
  }, 30_000);
}
