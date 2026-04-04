import { useEffect } from "react";
import { useSyncStore, rehydrateStores } from "../stores/useSyncStore";
import { getSyncHandle } from "../utils/syncIdb";
import { restoreFromFile, backupToFile } from "../utils/storage";
import { useBlockStore } from "../stores/useBlockStore";
import { STORAGE_PREFIX } from "../constants";

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
      // Migrate github-sync-* keys stranded in session-scoped paths (JW-8 fix for v1.0.6 regression)
      // These keys were written without being in GLOBAL_KEYS, so storageKey() routed them to
      // session:{date}:{key}. On next boot with empty _activeDate they were unreadable.
      const githubKeysToMigrate = ["github-sync-enabled", "github-sync-repo", "github-sync-token"];
      for (const key of githubKeysToMigrate) {
        const globalFullKey = STORAGE_PREFIX + key;
        if (!localStorage.getItem(globalFullKey)) {
          // Collect stranded session-scoped versions first, then migrate
          const toMigrate: { from: string; val: string }[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(STORAGE_PREFIX + "session:") && k.endsWith(":" + key)) {
              const val = localStorage.getItem(k);
              if (val) toMigrate.push({ from: k, val });
            }
          }
          if (toMigrate.length > 0) {
            localStorage.setItem(globalFullKey, toMigrate[0].val);
            for (const { from } of toMigrate) localStorage.removeItem(from);
            console.log(`[boot] migrated ${key} from session scope to global`);
          }
        }
      }

      const store = useSyncStore.getState();
      // Re-read github settings after migration (store was initialized before migration ran)
      store.refreshGithubSettings?.();
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
