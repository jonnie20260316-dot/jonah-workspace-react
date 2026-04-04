import { create } from "zustand";
import { loadJSON, saveJSON, loadText, saveText } from "../utils/storage";
import { normaliseViewport } from "../utils/viewport";
import {
  getSyncHandle,
  setSyncHandle,
  clearSyncHandleFromIdb,
} from "../utils/syncIdb";
import {
  getOrCreateDeviceId,
  buildSyncPayload,
  filterPayloadForSync,
  applySyncPayload,
  SYNC_FILENAME,
  gitCommitAndPush,
  gitPullAndApply,
  setUseSyncStoreRef,
} from "../utils/sync";
import { useBlockStore } from "./useBlockStore";
import { useViewportStore } from "./useViewportStore";
import { useProjectStore } from "./useProjectStore";
import { useSessionStore } from "./useSessionStore";
import type { SyncMeta, SyncStatus, SyncQueueItem, SyncPayload, ConflictInfo, GitSyncStatus } from "../types";
import type { Block } from "../types";
import type { ProjectCard } from "./useProjectStore";

// File System Access API — not yet in TypeScript's built-in DOM lib
type FSHandle = FileSystemDirectoryHandle & {
  requestPermission: (opts: { mode: string }) => Promise<string>;
  queryPermission: (opts: { mode: string }) => Promise<string>;
};

const ELECTRON_SYNC_DIR_KEY = "electron-sync-dir";

function isElectron(): boolean {
  return !!window.electronAPI?.isElectron;
}

function getElectronSyncDir(): string | null {
  return localStorage.getItem(ELECTRON_SYNC_DIR_KEY);
}

function setElectronSyncDir(dirPath: string): void {
  localStorage.setItem(ELECTRON_SYNC_DIR_KEY, dirPath);
}

/** Electron push: write sync JSON via IPC. Returns the payload + new push count. */
async function electronPush(
  syncMeta: SyncMeta,
  deviceId: string,
  selectedIds?: string[]
): Promise<{ payload: SyncPayload; newPushCount: number }> {
  const api = window.electronAPI!;
  let dirPath = getElectronSyncDir();
  if (!dirPath) {
    dirPath = await api.openDirectory();
    if (!dirPath) throw Object.assign(new Error("User cancelled"), { name: "AbortError" });
    setElectronSyncDir(dirPath);
  }

  const newPushCount = (syncMeta.pushCount ?? 0) + 1;
  let payload = buildSyncPayload(deviceId || getOrCreateDeviceId(), newPushCount);
  if (selectedIds?.length) payload = filterPayloadForSync(payload, selectedIds);

  const ok = await api.writeFile(dirPath, SYNC_FILENAME, JSON.stringify(payload, null, 2));
  if (!ok) throw new Error("[electron-sync] write failed");

  return { payload, newPushCount };
}

/** Electron pull: read sync JSON via IPC. Returns parsed payload or null. */
async function electronPull(
  autoMode: boolean
): Promise<SyncPayload | null> {
  const api = window.electronAPI!;
  let dirPath = getElectronSyncDir();
  if (!dirPath) {
    if (autoMode) return null;
    dirPath = await api.openDirectory();
    if (!dirPath) throw Object.assign(new Error("User cancelled"), { name: "AbortError" });
    setElectronSyncDir(dirPath);
  }

  const exists = await api.fileExists(dirPath, SYNC_FILENAME);
  if (!exists) return null;

  const text = await api.readFile(dirPath, SYNC_FILENAME);
  if (!text) return null;

  return JSON.parse(text) as SyncPayload;
}

interface SyncStore {
  syncMeta: SyncMeta;
  syncStatus: SyncStatus;
  deviceId: string;
  syncQueue: SyncQueueItem[];
  reconnectBannerVisible: boolean;
  conflictInfo: ConflictInfo | null;

  // Git sync state
  gitEnabled: boolean;
  gitDir: string;
  gitRemote: string;
  gitSyncStatus: GitSyncStatus;
  gitLastSyncAt: string | null;
  gitError: string | null;

  initDeviceId: () => void;
  push: (selectedIds?: string[]) => Promise<void>;
  pull: (opts?: {
    autoMode?: boolean;
    selectedIds?: string[];
    onConflict?: (payload: SyncPayload) => Promise<boolean>;
  }) => Promise<"ok" | "up-to-date" | "cancelled" | "danger-cancelled">;
  setSyncStatus: (s: SyncStatus) => void;
  setConflict: (info: ConflictInfo) => void;
  clearConflict: () => void;
  clearSyncHandle: () => Promise<void>;

  // Git sync actions
  setGitEnabled: (v: boolean) => void;
  setGitDir: (dir: string) => void;
  setGitRemote: (url: string) => void;
  setGitSyncStatus: (s: GitSyncStatus) => void;
  gitSetup: (dirPath: string, remoteUrl: string) => Promise<{ ok: boolean; error?: string }>;
  gitSyncNow: () => Promise<void>;
  gitSyncOnQuit: () => Promise<void>;
}

const DEFAULT_SYNC_META: SyncMeta = {
  lastPushedAt: null,
  pushCount: 0,
  lastPulledAt: null,
  lastPulledRemotePushedAt: null,
};

/** Rehydrate all Zustand stores from localStorage after a pull */
export function rehydrateStores(): void {
  const blocks = loadJSON<Block[]>("blocks", []);
  useBlockStore.setState({ blocks });

  const vp = loadJSON("viewport", { x: 700, y: 120 });
  useViewportStore.setState({ viewport: normaliseViewport(vp) });

  const rawBoard = loadJSON<Record<string, unknown>>("project-board", {});
  // Use setProjectBoard action so it stays consistent
  useProjectStore.getState().setProjectBoard(
    useProjectStore.getState().projectBoard // force normBoard re-run
  );
  // Direct setState is simpler for rehydration since normBoard is private:
  useProjectStore.setState({
    projectBoard: {
      queue: Array.isArray(rawBoard.queue) ? rawBoard.queue as ProjectCard[] : [],
      doing: Array.isArray(rawBoard.doing) ? rawBoard.doing as ProjectCard[] : [],
      archive: Array.isArray(rawBoard.archive) ? rawBoard.archive as ProjectCard[] : [],
    },
  });

  const lang = (loadText("lang") || "zh") as "zh" | "en";
  useSessionStore.setState({ lang });
}

export const useSyncStore = create<SyncStore>((set, get) => ({
  syncMeta: loadJSON<SyncMeta>("sync-meta", DEFAULT_SYNC_META),
  syncStatus: "idle",
  deviceId: "",
  syncQueue: loadJSON<SyncQueueItem[]>("sync-queue", []),
  reconnectBannerVisible: false,
  conflictInfo: null,

  // Git sync state (lazy-load from storage)
  gitEnabled: (loadText("git-sync-enabled") ?? "false") === "true",
  gitDir: loadText("git-sync-dir") ?? "",
  gitRemote: loadText("git-sync-remote") ?? "",
  gitSyncStatus: "idle" as GitSyncStatus,
  gitLastSyncAt: null,
  gitError: null,

  initDeviceId: () => {
    const id = getOrCreateDeviceId();
    set({ deviceId: id });
  },

  setSyncStatus: (syncStatus) => set({ syncStatus }),

  setConflict: (info) => set({ conflictInfo: info, syncStatus: "conflict" }),

  clearConflict: () => set({ conflictInfo: null, syncStatus: "idle" }),

  clearSyncHandle: async () => {
    await clearSyncHandleFromIdb();
    set({ syncStatus: "idle" });
  },

  // ─── Git sync actions ───────────────────────────────────────────────────────
  setGitEnabled: (v) => {
    saveText("git-sync-enabled", String(v));
    set({ gitEnabled: v });
  },

  setGitDir: (dir) => {
    saveText("git-sync-dir", dir);
    set({ gitDir: dir });
  },

  setGitRemote: (url) => {
    saveText("git-sync-remote", url);
    set({ gitRemote: url });
  },

  setGitSyncStatus: (s) => {
    set({ gitSyncStatus: s });
  },

  gitSetup: async (dirPath, remoteUrl) => {
    const api = window.electronAPI;
    if (!api) return { ok: false, error: "Not in Electron" };

    try {
      set({ gitSyncStatus: "syncing" });
      const result = await api.gitInit(dirPath, remoteUrl);
      if (result.ok) {
        set({ gitDir: dirPath, gitRemote: remoteUrl, gitEnabled: true, gitSyncStatus: "synced" });
        saveText("git-sync-dir", dirPath);
        saveText("git-sync-remote", remoteUrl);
        saveText("git-sync-enabled", "true");
        return { ok: true };
      } else {
        set({ gitSyncStatus: "error", gitError: result.stderr });
        return { ok: false, error: result.stderr };
      }
    } catch (err) {
      const msg = (err as Error).message;
      set({ gitSyncStatus: "error", gitError: msg });
      return { ok: false, error: msg };
    }
  },

  gitSyncNow: async () => {
    const { gitEnabled, gitDir, deviceId } = get();
    if (!gitEnabled || !gitDir) return;

    set({ gitSyncStatus: "syncing", gitError: null });

    try {
      // Pull first
      const pullResult = await gitPullAndApply(gitDir);
      if (pullResult.ok && pullResult.hadChanges) {
        rehydrateStores();
      }

      // Build and write sync payload before committing
      const syncMeta = get().syncMeta;
      const payload = buildSyncPayload(deviceId || getOrCreateDeviceId(), (syncMeta.pushCount ?? 0) + 1);
      const writeOk = await window.electronAPI!.writeFile(gitDir, SYNC_FILENAME, JSON.stringify(payload, null, 2));
      if (!writeOk) {
        set({ gitSyncStatus: "error", gitError: "Failed to write sync file" });
        return;
      }

      // Then push
      const pushResult = await gitCommitAndPush(gitDir);
      if (!pushResult.ok) {
        if (pushResult.authError) {
          set({ gitSyncStatus: "auth-error", gitError: pushResult.error ?? "Auth failed" });
        } else {
          set({ gitSyncStatus: "error", gitError: pushResult.error ?? "Push failed" });
        }
        return;
      }

      set({ gitSyncStatus: "synced", gitLastSyncAt: new Date().toISOString(), gitError: null });
    } catch (err) {
      const msg = (err as Error).message;
      set({ gitSyncStatus: "error", gitError: msg });
    }
  },

  gitSyncOnQuit: async () => {
    const { gitEnabled, gitDir } = get();
    if (!gitEnabled || !gitDir) return;

    try {
      // Only commit + push on quit, no pull
      const pushResult = await gitCommitAndPush(gitDir);
      if (pushResult.ok) {
        set({ gitLastSyncAt: new Date().toISOString() });
      }
    } catch (err) {
      // Silent failure on quit — don't block the app
      console.error("[git] quit-time sync failed:", err);
    }
  },

  push: async (selectedIds) => {
    const { syncMeta, deviceId } = get();
    set({ syncStatus: "syncing" });

    try {
      let payload: SyncPayload;
      let newPushCount: number;

      if (isElectron()) {
        // ── Electron path: IPC-based file write ──────────────────────────────
        ({ payload, newPushCount } = await electronPush(syncMeta, deviceId, selectedIds));
      } else {
        // ── Browser path: File System Access API ─────────────────────────────
        let handle = await getSyncHandle();
        if (!handle) {
          handle = await (window as unknown as { showDirectoryPicker: (opts: object) => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker({ mode: "readwrite" });
          await setSyncHandle(handle);
        }

        const perm = await (handle as FSHandle).requestPermission({ mode: "readwrite" });
        if (perm !== "granted") {
          set({ syncStatus: "error" });
          return;
        }

        newPushCount = (syncMeta.pushCount ?? 0) + 1;
        payload = buildSyncPayload(deviceId || getOrCreateDeviceId(), newPushCount);
        if (selectedIds?.length) payload = filterPayloadForSync(payload, selectedIds);

        const fileHandle = await handle!.getFileHandle(SYNC_FILENAME, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(payload, null, 2));
        await writable.close();
      }

      // Update meta (shared for both paths)
      const newMeta: SyncMeta = {
        ...syncMeta,
        lastPushedAt: payload.pushedAt,
        pushCount: newPushCount,
      };
      saveJSON("sync-meta", newMeta);
      set({ syncMeta: newMeta, syncStatus: "synced" });
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") {
        set({ syncStatus: "idle" });
      } else {
        console.error("[sync] push failed:", err);
        set({ syncStatus: "error" });
      }
    }
  },

  pull: async (opts = {}) => {
    const { autoMode = false, selectedIds, onConflict } = opts;
    const { syncMeta } = get();
    set({ syncStatus: "syncing" });

    try {
      let remote: SyncPayload;

      if (isElectron()) {
        // ── Electron path: IPC-based file read ───────────────────────────────
        const result = await electronPull(autoMode);
        if (!result) {
          set({ syncStatus: "idle" });
          return "cancelled";
        }
        remote = result;
      } else {
        // ── Browser path: File System Access API ─────────────────────────────
        let handle = await getSyncHandle();
        if (!handle) {
          if (autoMode) {
            set({ syncStatus: "idle" });
            return "cancelled";
          }
          handle = await (window as unknown as { showDirectoryPicker: (opts: object) => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker({ mode: "read" });
          await setSyncHandle(handle);
        }

        const perm = await (handle as FSHandle).requestPermission({ mode: "read" });
        if (perm !== "granted") {
          set({ syncStatus: autoMode ? "idle" : "error" });
          return "cancelled";
        }

        let fileHandle: FileSystemFileHandle;
        try {
          fileHandle = await handle!.getFileHandle(SYNC_FILENAME);
        } catch {
          set({ syncStatus: "idle" });
          return "cancelled";
        }

        const file = await fileHandle.getFile();
        const text = await file.text();
        remote = JSON.parse(text);
      }

      // ─── Conflict detection ───────────────────────────────────────────────

      // Case B: Remote matches what we last pulled — already up to date
      if (
        remote.pushedAt &&
        syncMeta.lastPulledRemotePushedAt &&
        remote.pushedAt === syncMeta.lastPulledRemotePushedAt
      ) {
        set({ syncStatus: "synced" });
        return "up-to-date";
      }

      // Case C: Remote is older than last local push — danger
      if (
        typeof remote.pushCount === "number" &&
        typeof syncMeta.pushCount === "number" &&
        remote.pushCount < syncMeta.pushCount
      ) {
        const conflictInfo: ConflictInfo = {
          remote,
          detectedAt: new Date().toISOString(),
        };
        set({ syncStatus: "conflict", conflictInfo });
        // If caller provided conflict handler, let them confirm
        if (onConflict) {
          const proceed = await onConflict(remote);
          if (!proceed) {
            set({ syncStatus: "idle" });
            return "danger-cancelled";
          }
        } else if (!autoMode) {
          // No handler + not auto = refuse
          set({ syncStatus: "idle" });
          return "danger-cancelled";
        }
        // autoMode never forces Case C pull silently
        if (autoMode) {
          set({ syncStatus: "idle" });
          return "danger-cancelled";
        }
      }

      // Case A: Normal pull — apply
      let payload = remote;
      if (selectedIds && selectedIds.length > 0) {
        payload = filterPayloadForSync(remote, selectedIds);
      }

      applySyncPayload(payload);
      rehydrateStores();

      // Update meta
      const newMeta: SyncMeta = {
        ...syncMeta,
        lastPulledAt: new Date().toISOString(),
        lastPulledRemotePushedAt: remote.pushedAt,
      };
      saveJSON("sync-meta", newMeta);
      set({ syncMeta: newMeta, syncStatus: "synced" });
      return "ok";
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") {
        set({ syncStatus: "idle" });
        return "cancelled";
      }
      console.error("[sync] pull failed:", err);
      set({ syncStatus: "error" });
      return "cancelled";
    }
  },
}));

// Register the store reference for scheduleGitSync
setUseSyncStoreRef(useSyncStore);
