import { useEffect } from "react";
import { useSyncStore } from "../stores/useSyncStore";
import { getSyncHandle } from "../utils/syncIdb";

type FSHandleBoot = FileSystemDirectoryHandle & {
  queryPermission: (opts: { mode: string }) => Promise<string>;
};

/**
 * Auto-pull on app boot if a sync folder was previously configured.
 * Supports both Electron Git sync and browser File System Access API.
 * Runs once on mount.
 */
export function useSyncBoot(): void {
  useEffect(() => {
    const boot = async () => {
      const store = useSyncStore.getState();
      store.initDeviceId();

      // Electron git sync path
      if (window.electronAPI?.isElectron) {
        const { gitEnabled, gitDir } = store;
        if (gitEnabled && gitDir) {
          try {
            await store.gitSyncNow();
          } catch (err) {
            console.error("[git-boot] sync failed:", err);
          }
        }
        return;
      }

      // Browser file system path
      const handle = await getSyncHandle();
      if (!handle) return;

      try {
        const perm = await (handle as FSHandleBoot).queryPermission({ mode: "read" });
        if (perm === "granted") {
          await store.pull({ autoMode: true });
        }
      } catch {
        // Permission query failed (private browsing, etc.) — silent skip
      }
    };

    boot();
  }, []);
}
