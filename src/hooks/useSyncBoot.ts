import { useEffect } from "react";
import { useSyncStore, rehydrateStores } from "../stores/useSyncStore";
import { getSyncHandle } from "../utils/syncIdb";
import { restoreFromFile, backupToFile } from "../utils/storage";
import { useBlockStore } from "../stores/useBlockStore";

type FSHandleBoot = FileSystemDirectoryHandle & {
  queryPermission: (opts: { mode: string }) => Promise<string>;
};

/**
 * Auto-pull on app boot if a sync folder was previously configured.
 * Supports both Electron Git sync and browser File System Access API.
 * Runs once on mount.
 */
export function useSyncBoot(): void {
  // Auto-backup every 2 minutes — insurance against sudden quit / power loss
  useEffect(() => {
    if (!window.electronAPI?.isElectron) return;
    const intervalId = setInterval(() => {
      backupToFile().catch(console.error);
    }, 2 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const boot = async () => {
      const store = useSyncStore.getState();
      store.initDeviceId();

      // Electron path
      if (window.electronAPI?.isElectron) {
        // If localStorage is empty (e.g. after a bad quit), restore from file backup
        const blocks = useBlockStore.getState().blocks;
        if (blocks.length === 0) {
          const restored = await restoreFromFile();
          if (restored) {
            rehydrateStores();
          }
        }

        const { githubEnabled, githubRepo, githubToken } = store;
        if (githubEnabled && githubRepo && githubToken) {
          try {
            await store.githubSyncNow();
          } catch (err) {
            console.error("[github-boot] sync failed:", err);
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
