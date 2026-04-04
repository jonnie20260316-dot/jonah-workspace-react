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
  githubPush,
  githubPull,
  parseGithubRepo,
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

  // GitHub sync state
  githubEnabled: boolean;
  githubRepo: string;
  githubToken: string;
  githubSyncStatus: GitSyncStatus;
  githubLastSyncAt: string | null;
  githubError: string | null;

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

  // GitHub sync actions
  setGithubEnabled: (v: boolean) => void;
  setGithubRepo: (repo: string) => void;
  setGithubToken: (token: string) => void;
  githubSetup: (repoUrl: string, token: string) => { ok: boolean; error?: string };
  githubSyncNow: () => Promise<void>;
  githubSyncOnQuit: () => Promise<void>;
  refreshGithubSettings: () => void;
}

const DEFAULT_SYNC_META: SyncMeta = {
  lastPushedAt: null,
  pushCount: 0,
  lastPulledAt: null,
  lastPulledRemotePushedAt: null,
};

/** Rehydrate all Zustand stores from localStorage after a pull.
 *  Uses granular block merge to avoid unmounting active recording components (JW-28).
 */
export function rehydrateStores(): void {
  const newBlocks = loadJSON<Block[]>("blocks", []);
  const currentBlocks = useBlockStore.getState().blocks;

  // Only replace blocks if IDs or order changed — prevents React unmount/remount
  // which triggers JW-28 cleanup and kills active recordings.
  const idsChanged =
    newBlocks.length !== currentBlocks.length ||
    newBlocks.some((nb, i) => nb.id !== currentBlocks[i]?.id);

  if (idsChanged) {
    useBlockStore.setState({ blocks: newBlocks });
  } else {
    // Same block IDs in same order — merge only changed props per block
    let anyChanged = false;
    const merged = newBlocks.map((nb, i) => {
      const cb = currentBlocks[i];
      // Quick JSON comparison — blocks are plain data objects
      if (JSON.stringify(nb) === JSON.stringify(cb)) return cb;
      anyChanged = true;
      return { ...cb, ...nb };
    });
    if (anyChanged) useBlockStore.setState({ blocks: merged });
  }

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

  // GitHub sync state (lazy-load from storage; migrate old git-sync-remote key if present)
  githubEnabled: (loadText("github-sync-enabled") ?? "false") === "true",
  githubRepo: loadText("github-sync-repo") ?? (() => {
    // Migration: parse owner/repo from old git-sync-remote if new key absent
    const oldRemote = loadText("git-sync-remote");
    if (oldRemote) {
      const m = oldRemote.match(/github\.com[/:]([\w.-]+)\/([\w.-]+)/);
      if (m) return `${m[1]}/${m[2].replace(/\.git$/, "")}`;
    }
    return "";
  })(),
  githubToken: loadText("github-sync-token") ?? "",
  githubSyncStatus: "idle" as GitSyncStatus,
  githubLastSyncAt: null,
  githubError: null,

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

  // ─── GitHub sync actions ────────────────────────────────────────────────────

  // Re-read github-sync-* keys from localStorage (call after boot-time migration)
  refreshGithubSettings: () => {
    set({
      githubEnabled: (loadText("github-sync-enabled") ?? "false") === "true",
      githubRepo: loadText("github-sync-repo") ?? "",
      githubToken: loadText("github-sync-token") ?? "",
    });
  },

  setGithubEnabled: (v) => {
    saveText("github-sync-enabled", String(v));
    set({ githubEnabled: v });
  },

  setGithubRepo: (repo) => {
    saveText("github-sync-repo", repo);
    set({ githubRepo: repo });
  },

  setGithubToken: (token) => {
    saveText("github-sync-token", token);
    set({ githubToken: token });
  },

  githubSetup: (repoUrl, token) => {
    const parsed = parseGithubRepo(repoUrl);
    if (!parsed) return { ok: false, error: "Cannot parse repo from URL. Use https://github.com/owner/repo or owner/repo format." };
    const repo = `${parsed.owner}/${parsed.repo}`;
    saveText("github-sync-repo", repo);
    saveText("github-sync-token", token);
    saveText("github-sync-enabled", "true");
    set({ githubRepo: repo, githubToken: token, githubEnabled: true });
    return { ok: true };
  },

  githubSyncNow: async () => {
    const { githubEnabled, githubRepo, githubToken, deviceId } = get();
    if (!githubEnabled || !githubRepo || !githubToken) return;

    const parsed = parseGithubRepo(githubRepo);
    if (!parsed) {
      set({ githubSyncStatus: "error", githubError: "Invalid repo format" });
      return;
    }

    set({ githubSyncStatus: "syncing", githubError: null });

    try {
      // Pull first — apply remote changes if any
      const pullResult = await githubPull(githubToken, parsed.owner, parsed.repo);
      if (pullResult.ok && pullResult.hadChanges) {
        // Skip rehydration if the remote file was pushed by this device — it's our own
        // data coming back, localStorage already has the correct state. Rehydrating would
        // replace the blocks array reference and unmount active recording components (JW-28).
        const localDeviceId = deviceId || getOrCreateDeviceId();
        const remoteDeviceId = pullResult.payload?.deviceId;
        if (remoteDeviceId !== localDeviceId) {
          rehydrateStores();
        }
      }

      // Push current state
      const syncMeta = get().syncMeta;
      const pushResult = await githubPush(
        githubToken, parsed.owner, parsed.repo,
        deviceId || getOrCreateDeviceId(),
        (syncMeta.pushCount ?? 0) + 1
      );

      if (!pushResult.ok) {
        set({ githubSyncStatus: "error", githubError: pushResult.error ?? "Push failed" });
        return;
      }

      set({ githubSyncStatus: "synced", githubLastSyncAt: new Date().toISOString(), githubError: null });
    } catch (err) {
      set({ githubSyncStatus: "error", githubError: (err as Error).message });
    }
  },

  githubSyncOnQuit: async () => {
    const { githubEnabled, githubRepo, githubToken, deviceId, syncMeta } = get();
    if (!githubEnabled || !githubRepo || !githubToken) return;

    const parsed = parseGithubRepo(githubRepo);
    if (!parsed) return;

    try {
      await githubPush(
        githubToken, parsed.owner, parsed.repo,
        deviceId || getOrCreateDeviceId(),
        (syncMeta.pushCount ?? 0) + 1
      );
    } catch {
      // Silent on quit — don't block app from closing
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
