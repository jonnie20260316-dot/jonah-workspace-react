import { useCallback, useEffect } from "react";
import { saveTokens, clearTokens } from "../../utils/youtubeApi";
import { pick } from "../../utils/i18n";
import type { YTBroadcast, YTStreamHealth } from "../../utils/youtubeApi";
import type { YTTokens } from "../../types";

interface UseYouTubeAuthParams {
  setAuthed: (v: boolean) => void;
  setError: (msg: string | null) => void;
  pollRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>;
  setBroadcasts: (bcs: YTBroadcast[]) => void;
  setStreamHealth: (h: YTStreamHealth | null) => void;
}

export function useYouTubeAuth({
  setAuthed,
  setError,
  pollRef,
  setBroadcasts,
  setStreamHealth,
}: UseYouTubeAuthParams) {
  const isElectron = !!window.electronAPI?.youtubeAuthStart;

  // Listen for OAuth tokens from Electron main process
  useEffect(() => {
    if (!window.electronAPI?.onYoutubeTokens) return;
    const unsub = window.electronAPI.onYoutubeTokens((tokens: YTTokens) => {
      saveTokens(tokens);
      setAuthed(true);
      setError(null);
    });
    return unsub;
  }, [setAuthed, setError]);

  const handleConnect = useCallback(() => {
    if (!isElectron) {
      setError(pick("需要 Electron 桌面版", "Requires Electron desktop app"));
      return;
    }
    window.electronAPI!.youtubeAuthStart();
  }, [isElectron, setError]);

  const handleDisconnect = useCallback(() => {
    clearTokens();
    setAuthed(false);
    setBroadcasts([]);
    setStreamHealth(null);
    if (pollRef.current) clearInterval(pollRef.current);
  }, [setAuthed, pollRef, setBroadcasts, setStreamHealth]);

  return { isElectron, handleConnect, handleDisconnect };
}
