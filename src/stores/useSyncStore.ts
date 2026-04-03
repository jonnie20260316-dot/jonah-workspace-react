import { create } from "zustand";
import { loadJSON, saveJSON, loadText } from "../utils/storage";
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
} from "../utils/sync";
import { useBlockStore } from "./useBlockStore";
import { useViewportStore } from "./useViewportStore";
import { useProjectStore } from "./useProjectStore";
import { useSessionStore } from "./useSessionStore";
import type { SyncMeta, SyncStatus, SyncQueueItem, SyncPayload, ConflictInfo } from "../types";
import type { Block } from "../types";
import type { ProjectCard } from "./useProjectStore";

// File System Access API — not yet in TypeScript's built-in DOM lib
type FSHandle = FileSystemDirectoryHandle & {
  requestPermission: (opts: { mode: string }) => Promise<string>;
  queryPermission: (opts: { mode: string }) => Promise<string>;
};

interface SyncStore {
  syncMeta: SyncMeta;
  syncStatus: SyncStatus;
  deviceId: string;
  syncQueue: SyncQueueItem[];
  reconnectBannerVisible: boolean;
  conflictInfo: ConflictInfo | null;

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
}

const DEFAULT_SYNC_META: SyncMeta = {
  lastPushedAt: null,
  pushCount: 0,
  lastPulledAt: null,
  lastPulledRemotePushedAt: null,
};

/** Rehydrate all Zustand stores from localStorage after a pull */
function rehydrateStores(): void {
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

  push: async (selectedIds) => {
    const { syncMeta, deviceId } = get();
    set({ syncStatus: "syncing" });

    try {
      // Get or request folder
      let handle = await getSyncHandle();
      if (!handle) {
        handle = await (window as unknown as { showDirectoryPicker: (opts: object) => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker({ mode: "readwrite" });
        await setSyncHandle(handle);
      }

      // Verify write permission
      const perm = await (handle as FSHandle).requestPermission({ mode: "readwrite" });
      if (perm !== "granted") {
        set({ syncStatus: "error" });
        return;
      }

      // Build payload
      const newPushCount = (syncMeta.pushCount ?? 0) + 1;
      let payload = buildSyncPayload(deviceId || getOrCreateDeviceId(), newPushCount);
      if (selectedIds && selectedIds.length > 0) {
        payload = filterPayloadForSync(payload, selectedIds);
      }

      // Write file
      const fileHandle = await handle!.getFileHandle(SYNC_FILENAME, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(payload, null, 2));
      await writable.close();

      // Update meta
      const newMeta: SyncMeta = {
        ...syncMeta,
        lastPushedAt: payload.pushedAt,
        pushCount: newPushCount,
      };
      saveJSON("sync-meta", newMeta);
      set({ syncMeta: newMeta, syncStatus: "synced" });
    } catch (err) {
      // AbortError = user cancelled picker
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
      // Get or request folder
      let handle = await getSyncHandle();
      if (!handle) {
        if (autoMode) {
          set({ syncStatus: "idle" });
          return "cancelled";
        }
        handle = await (window as unknown as { showDirectoryPicker: (opts: object) => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker({ mode: "read" });
        await setSyncHandle(handle);
      }

      // Verify read permission
      const perm = await (handle as FSHandle).requestPermission({ mode: "read" });
      if (perm !== "granted") {
        set({ syncStatus: autoMode ? "idle" : "error" });
        return "cancelled";
      }

      // Read sync file
      let fileHandle: FileSystemFileHandle;
      try {
        fileHandle = await handle!.getFileHandle(SYNC_FILENAME);
      } catch {
        // File doesn't exist yet
        set({ syncStatus: "idle" });
        return "cancelled";
      }

      const file = await fileHandle.getFile();
      const text = await file.text();
      const remote: SyncPayload = JSON.parse(text);

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
