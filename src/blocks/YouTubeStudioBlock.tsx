import { useState, useEffect, useCallback, useRef } from "react";
import { useLang } from "../hooks/useLang";
import { pick } from "../utils/i18n";
import {
  getStoredTokens,
  saveTokens,
  clearTokens,
  listBroadcasts,
  transitionBroadcast,
  getStreamHealth,
} from "../utils/youtubeApi";
import type { YTBroadcast, YTStreamHealth } from "../utils/youtubeApi";
import type { Block, YTTokens } from "../types";

interface YouTubeStudioBlockProps {
  block: Block;
}

const POLL_INTERVAL = 30_000;

/** Status pill color map */
function statusColor(status: string): string {
  switch (status) {
    case "live": return "#ff0000";
    case "testing": return "#ff9800";
    case "ready": return "#4caf50";
    case "created": return "#2196f3";
    default: return "#888";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "live": return pick("直播中", "LIVE");
    case "testing": return pick("測試中", "TESTING");
    case "ready": return pick("就緒", "READY");
    case "created": return pick("已建立", "CREATED");
    case "complete": return pick("已結束", "ENDED");
    default: return status.toUpperCase();
  }
}

function healthLabel(status: string): string {
  switch (status) {
    case "good": return pick("良好", "Good");
    case "ok": return pick("尚可", "OK");
    case "bad": return pick("不佳", "Bad");
    case "noData": return pick("無數據", "No Data");
    default: return status;
  }
}

function healthColor(status: string): string {
  switch (status) {
    case "good": return "#4caf50";
    case "ok": return "#ff9800";
    case "bad": return "#f44336";
    default: return "#888";
  }
}

export function YouTubeStudioBlock({ block }: YouTubeStudioBlockProps) {
  useLang();
  const [authed, setAuthed] = useState(() => getStoredTokens() !== null);
  const [broadcasts, setBroadcasts] = useState<YTBroadcast[]>([]);
  const [streamHealth, setStreamHealth] = useState<YTStreamHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
  }, []);

  // Fetch broadcasts + stream health
  const refresh = useCallback(async () => {
    if (!getStoredTokens()) return;
    setLoading(true);
    setError(null);
    try {
      const bcs = await listBroadcasts();
      setBroadcasts(bcs);

      // Get stream health for the first active/testing broadcast
      const activeBc = bcs.find((b) => b.lifeCycleStatus === "live" || b.lifeCycleStatus === "testing");
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
  }, []);

  // Auto-poll when authenticated
  useEffect(() => {
    if (!authed) return;
    refresh();
    pollRef.current = setInterval(refresh, POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [authed, refresh]);

  const handleConnect = useCallback(() => {
    if (!isElectron) {
      setError(pick("需要 Electron 桌面版", "Requires Electron desktop app"));
      return;
    }
    window.electronAPI!.youtubeAuthStart();
  }, [isElectron]);

  const handleDisconnect = useCallback(() => {
    clearTokens();
    setAuthed(false);
    setBroadcasts([]);
    setStreamHealth(null);
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  const handleTransition = useCallback(async (id: string, status: "testing" | "live" | "complete") => {
    if (status === "complete") {
      const confirmed = window.confirm(pick("確定要結束直播？", "End the live stream?"));
      if (!confirmed) return;
    }
    setTransitioning(true);
    try {
      const ok = await transitionBroadcast(id, status);
      if (ok) {
        // Refresh immediately to show new status
        await refresh();
      } else {
        setError(pick("操作失敗", "Operation failed"));
      }
    } catch {
      setError(pick("操作失敗", "Operation failed"));
    } finally {
      setTransitioning(false);
    }
  }, [refresh]);

  const s = (base: number) => `calc(${base}px * var(--text-scale, 1))`;

  // ─── Unauthenticated state ───────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", height: "100%", gap: "16px", padding: "24px",
      }}>
        <div style={{ fontSize: s(40) }}>▶</div>
        <div style={{ fontSize: s(16), fontWeight: 600, color: "#333" }}>
          YouTube Studio
        </div>
        <div style={{ fontSize: s(12), color: "#888", textAlign: "center" }}>
          {pick("連接 YouTube 帳號以控制直播", "Connect your YouTube account to control live streams")}
        </div>
        <button
          onClick={handleConnect}
          style={{
            padding: "10px 24px", fontSize: s(13), fontWeight: 600,
            backgroundColor: "#ff0000", color: "#fff", border: "none",
            borderRadius: "8px", cursor: "pointer",
          }}
        >
          {pick("連接 YouTube", "Connect YouTube")}
        </button>
        {!isElectron && (
          <div style={{ fontSize: s(11), color: "#f44336" }}>
            {pick("需要 Electron 桌面版", "Requires Electron desktop app")}
          </div>
        )}
        {error && <div style={{ fontSize: s(11), color: "#f44336" }}>{error}</div>}
      </div>
    );
  }

  // ─── Authenticated state ─────────────────────────────────────────────────
  const activeBc = broadcasts.find(
    (b) => b.lifeCycleStatus === "live" || b.lifeCycleStatus === "testing"
  );
  const upcomingBcs = broadcasts.filter(
    (b) => b.lifeCycleStatus !== "live" && b.lifeCycleStatus !== "testing" && b.lifeCycleStatus !== "complete"
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "10px", padding: "8px" }}>
      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: s(11), color: "#888" }}>
          {loading ? pick("載入中…", "Loading…") : pick("已連接", "Connected")}
        </span>
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            onClick={refresh}
            disabled={loading}
            style={{
              padding: "4px 8px", fontSize: s(11), backgroundColor: "#f0f0f0",
              border: "none", borderRadius: "4px", cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.5 : 1,
            }}
          >
            {pick("刷新", "Refresh")}
          </button>
          <button
            onClick={handleDisconnect}
            style={{
              padding: "4px 8px", fontSize: s(11), backgroundColor: "#f0f0f0",
              color: "#e53935", border: "none", borderRadius: "4px", cursor: "pointer",
            }}
          >
            {pick("斷開", "Disconnect")}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ fontSize: s(11), color: "#f44336", padding: "4px 8px", backgroundColor: "#fff3f3", borderRadius: "4px" }}>
          {error}
        </div>
      )}

      {/* Active broadcast */}
      {activeBc && (
        <div style={{
          padding: "12px", backgroundColor: "#fafafa", borderRadius: "8px",
          border: `2px solid ${statusColor(activeBc.lifeCycleStatus)}`,
          display: "flex", flexDirection: "column", gap: "10px",
        }}>
          {/* Title + status */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: s(14), fontWeight: 600, color: "#222", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {activeBc.title || pick("未命名直播", "Untitled broadcast")}
            </span>
            <span style={{
              padding: "3px 10px", fontSize: s(10), fontWeight: 700,
              backgroundColor: statusColor(activeBc.lifeCycleStatus),
              color: "#fff", borderRadius: "12px", textTransform: "uppercase",
            }}>
              {statusLabel(activeBc.lifeCycleStatus)}
            </span>
          </div>

          {/* Viewers */}
          {activeBc.lifeCycleStatus === "live" && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ color: "#ff0000", fontSize: s(12) }}>●</span>
              <span style={{ fontSize: s(13), fontWeight: 600, color: "#333" }}>
                {activeBc.concurrentViewers ?? "0"}
              </span>
              <span style={{ fontSize: s(11), color: "#888" }}>
                {pick("位觀眾", "watching")}
              </span>
            </div>
          )}

          {/* Stream health */}
          {streamHealth && (
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px",
              fontSize: s(11), color: "#666",
            }}>
              <div>
                <span style={{ color: "#999" }}>{pick("狀態", "Health")}: </span>
                {streamHealth.healthStatus ? (
                  <span style={{ color: healthColor(streamHealth.healthStatus.status), fontWeight: 600 }}>
                    {healthLabel(streamHealth.healthStatus.status)}
                  </span>
                ) : "—"}
              </div>
              <div>
                <span style={{ color: "#999" }}>{pick("解析度", "Res")}: </span>
                {streamHealth.resolution || "—"}
              </div>
              <div>
                <span style={{ color: "#999" }}>{pick("幀率", "FPS")}: </span>
                {streamHealth.frameRate || "—"}
              </div>
            </div>
          )}

          {/* Health issues */}
          {streamHealth?.healthStatus?.configurationIssues?.length ? (
            <div style={{ fontSize: s(10), color: "#f44336" }}>
              {streamHealth.healthStatus.configurationIssues.map((issue, i) => (
                <div key={i}>⚠ {issue.description}</div>
              ))}
            </div>
          ) : null}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "8px" }}>
            {activeBc.lifeCycleStatus === "ready" && (
              <button
                onClick={() => handleTransition(activeBc.id, "testing")}
                disabled={transitioning}
                style={{
                  flex: 1, padding: "8px", fontSize: s(12), fontWeight: 600,
                  backgroundColor: "#ff9800", color: "#fff", border: "none",
                  borderRadius: "6px", cursor: transitioning ? "default" : "pointer",
                  opacity: transitioning ? 0.5 : 1,
                }}
              >
                {pick("開始預覽", "Start Preview")}
              </button>
            )}
            {(activeBc.lifeCycleStatus === "testing" || activeBc.lifeCycleStatus === "ready") && (
              <button
                onClick={() => handleTransition(activeBc.id, "live")}
                disabled={transitioning}
                style={{
                  flex: 1, padding: "8px", fontSize: s(12), fontWeight: 600,
                  backgroundColor: "#ff0000", color: "#fff", border: "none",
                  borderRadius: "6px", cursor: transitioning ? "default" : "pointer",
                  opacity: transitioning ? 0.5 : 1,
                }}
              >
                {pick("開始直播", "Go Live")}
              </button>
            )}
            {activeBc.lifeCycleStatus === "live" && (
              <button
                onClick={() => handleTransition(activeBc.id, "complete")}
                disabled={transitioning}
                style={{
                  flex: 1, padding: "8px", fontSize: s(12), fontWeight: 600,
                  backgroundColor: "#555", color: "#fff", border: "none",
                  borderRadius: "6px", cursor: transitioning ? "default" : "pointer",
                  opacity: transitioning ? 0.5 : 1,
                }}
              >
                {pick("結束直播", "End Stream")}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Upcoming broadcasts */}
      {upcomingBcs.length > 0 && (
        <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ fontSize: s(11), color: "#999", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {pick("排程直播", "Upcoming")}
          </div>
          {upcomingBcs.map((bc) => (
            <div
              key={bc.id}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 10px", backgroundColor: "#f9f9f9", borderRadius: "6px",
              }}
            >
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ fontSize: s(12), fontWeight: 500, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {bc.title || pick("未命名", "Untitled")}
                </div>
                <div style={{ fontSize: s(10), color: "#999" }}>
                  {new Date(bc.scheduledStartTime).toLocaleString()}
                </div>
              </div>
              <span style={{
                padding: "2px 8px", fontSize: s(9), fontWeight: 600,
                backgroundColor: statusColor(bc.lifeCycleStatus),
                color: "#fff", borderRadius: "10px",
              }}>
                {statusLabel(bc.lifeCycleStatus)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* No broadcasts */}
      {!activeBc && upcomingBcs.length === 0 && !loading && (
        <div style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", color: "#bbb", fontSize: s(12), gap: "8px",
        }}>
          <div style={{ fontSize: s(24) }}>📡</div>
          <div>{pick("沒有排程或進行中的直播", "No scheduled or active broadcasts")}</div>
          <div style={{ fontSize: s(10), color: "#ccc" }}>
            {pick("在 YouTube Studio 中建立直播後會顯示在這裡", "Create a broadcast in YouTube Studio to see it here")}
          </div>
        </div>
      )}
    </div>
  );
}
