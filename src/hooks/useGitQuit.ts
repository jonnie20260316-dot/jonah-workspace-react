import { useEffect } from "react";
import { useSyncStore } from "../stores/useSyncStore";

/**
 * Listen for quit signal from Electron main process.
 * When app is about to quit, perform final git commit+push before allowing quit.
 * Calls electronAPI.requestQuit() when done, which tells main to proceed with quit.
 */
export function useGitQuit(): void {
  useEffect(() => {
    if (!window.electronAPI?.onAboutToQuit) return;

    const unsubscribe = window.electronAPI.onAboutToQuit(async () => {
      try {
        const { gitSyncOnQuit } = useSyncStore.getState();
        await gitSyncOnQuit();
      } catch (err) {
        console.error("[git-quit] sync failed:", err);
      } finally {
        // Tell main process to proceed with quit
        try {
          await window.electronAPI!.requestQuit();
        } catch (err) {
          console.error("[git-quit] request-quit failed:", err);
        }
      }
    });

    return unsubscribe;
  }, []);
}
