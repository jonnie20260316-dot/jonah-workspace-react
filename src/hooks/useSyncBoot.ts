import { useEffect } from "react";
import { useSyncStore } from "../stores/useSyncStore";
import { getSyncHandle } from "../utils/syncIdb";

type FSHandleBoot = FileSystemDirectoryHandle & {
  queryPermission: (opts: { mode: string }) => Promise<string>;
};

/**
 * Auto-pull on app boot if a sync folder was previously configured.
 * Silent (autoMode: true) — skips dialogs for normal Case A pulls.
 * Runs once on mount. If no folder handle found, does nothing.
 */
export function useSyncBoot(): void {
  useEffect(() => {
    const boot = async () => {
      const store = useSyncStore.getState();
      store.initDeviceId();

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
