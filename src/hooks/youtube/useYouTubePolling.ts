import { useState, useCallback, useEffect } from "react";
import { getStoredTokens, listBroadcasts, getStreamHealth } from "../../utils/youtubeApi";
import { pick } from "../../utils/i18n";
import type { YTBroadcast, YTStreamHealth } from "../../utils/youtubeApi";
import type { YTStreamStatus } from "../../types";

const POLL_INTERVAL = 30_000;

interface UseYouTubePollingParams {
  authed: boolean;
  rtmpStatus: YTStreamStatus["status"];
  pollRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>;
  setError: (msg: string | null) => void;
}

export function useYouTubePolling({ authed, rtmpStatus, pollRef, setError }: UseYouTubePollingParams) {
  const [broadcasts, setBroadcasts] = useState<YTBroadcast[]>([]);
  const [streamHealth, setStreamHealth] = useState<YTStreamHealth | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!getStoredTokens()) return;
    setLoading(true);
    setError(null);
    try {
      const bcs = await listBroadcasts();
      setBroadcasts(bcs);

      const activeBc =
        bcs.find((b) => b.lifeCycleStatus === "live" || b.lifeCycleStatus === "testing") ??
        bcs.find((b) => b.lifeCycleStatus === "ready" && b.boundStreamId !== null) ??
        null;
      if (activeBc?.boundStreamId) {
        const health = await getStreamHealth(activeBc.boundStreamId);
        setStreamHealth(health);
      } else {
        setStreamHealth(null);
      }
    } catch (err) {
      console.error("YouTube API error:", err);
      setError(pick("API 請求失敗", "API request failed"));
    } finally {
      setLoading(false);
    }
  }, [setError]);

  // Auto-poll when authenticated
  useEffect(() => {
    if (!authed) return;
    refresh();
    pollRef.current = setInterval(refresh, POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [authed, refresh, pollRef]);

  // Auto-refresh stream health after RTMP starts pushing
  useEffect(() => {
    if (rtmpStatus !== "streaming") return;
    const t1 = setTimeout(() => void refresh(), 8_000);
    const t2 = setTimeout(() => void refresh(), 18_000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [rtmpStatus, refresh]);

  return { broadcasts, setBroadcasts, streamHealth, setStreamHealth, loading, refresh };
}
