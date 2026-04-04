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
  getStreamKey,
  createBroadcast,
  createLiveStream,
  bindBroadcast,
} from "../utils/youtubeApi";
import { useStreamStore } from "../stores/useStreamStore";
import type { YTBroadcast, YTStreamHealth } from "../utils/youtubeApi";
import type { Block, YTTokens, YTStreamStatus } from "../types";

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
  const [rtmpStatus, setRtmpStatus] = useState<YTStreamStatus["status"]>("stopped");
  const [rtmpStarting, setRtmpStarting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createPrivacy, setCreatePrivacy] = useState<"public" | "private" | "unlisted">("private");
  const [creating, setCreating] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const activeStream = useStreamStore((s) => s.activeStream);

  const isElectron = !!window.electronAPI?.youtubeAuthStart;
  const hasRtmp = !!window.electronAPI?.youtubeStartStream;

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

  // Listen for RTMP stream status from FFmpeg
  useEffect(() => {
    if (!window.electronAPI?.onYoutubeStreamStatus) return;
    const unsub = window.electronAPI.onYoutubeStreamStatus((data: YTStreamStatus) => {
      setRtmpStatus(data.status);
      if (data.status === "error" && "error" in data) {
        setError(data.error);
      }
      if (data.status === "stopped" || data.status === "error") {
        // Stop the MediaRecorder if FFmpeg died
        if (recorderRef.current && recorderRef.current.state !== "inactive") {
          recorderRef.current.stop();
        }
        recorderRef.current = null;
        setRtmpStarting(false);
      }
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

  // ─── Create broadcast ───────────────────────────────────────────────────
  const handleCreate = useCallback(async () => {
    if (!createTitle.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const broadcastId = await createBroadcast(createTitle.trim(), createPrivacy);
      if (!broadcastId) throw new Error("broadcast creation failed");
      const streamInfo = await createLiveStream(createTitle.trim());
      if (!streamInfo) throw new Error("stream creation failed");
      await bindBroadcast(broadcastId, streamInfo.streamId);
      setShowCreateForm(false);
      setCreateTitle("");
      await refresh();
    } catch {
      setError(pick("建立直播失敗", "Failed to create broadcast"));
    } finally {
      setCreating(false);
    }
  }, [createTitle, createPrivacy, refresh]);

  // ─── RTMP streaming (FFmpeg) ────────────────────────────────────────────
  const startRtmpStream = useCallback(async (broadcast: YTBroadcast) => {
    if (!hasRtmp || !broadcast.boundStreamId) return;
    // Need an active capture source
    const stream = useStreamStore.getState().activeStream;
    if (!stream) {
      setError(pick("請先在錄影區塊開始擷取", "Start a capture source in Video Capture first"));
      return;
    }

    setRtmpStarting(true);
    setError(null);

    try {
      // Get RTMP URL + stream key from YouTube API
      const keyInfo = await getStreamKey(broadcast.boundStreamId);
      if (!keyInfo) {
        setError(pick("無法取得串流金鑰", "Failed to get stream key"));
        setRtmpStarting(false);
        return;
      }

      const rtmpUrl = `${keyInfo.rtmpUrl}/${keyInfo.streamKey}`;

      // Start FFmpeg process
      const ok = await window.electronAPI!.youtubeStartStream(rtmpUrl);
      if (!ok) {
        setRtmpStarting(false);
        return;
      }

      // Create a MediaRecorder to pipe chunks to FFmpeg
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : "video/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;

      recorder.ondataavailable = async (e) => {
        if (e.data.size > 0 && window.electronAPI?.youtubeStreamChunk) {
          const buf = await e.data.arrayBuffer();
          window.electronAPI.youtubeStreamChunk(buf);
        }
      };

      recorder.onerror = () => {
        setError(pick("錄製器錯誤", "Recorder error"));
        stopRtmpStream();
      };

      recorder.start(1000); // 1s chunks — matches OBS's push model
      setRtmpStarting(false);
    } catch (err) {
      console.error("RTMP stream start failed:", err);
      setError(pick("串流啟動失敗", "Stream start failed"));
      setRtmpStarting(false);
    }
  }, [hasRtmp]);

  const stopRtmpStream = useCallback(async () => {
    // Stop MediaRecorder
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    // Stop FFmpeg
    if (window.electronAPI?.youtubeStopStream) {
      await window.electronAPI.youtubeStopStream();
    }
  }, []);

  const isRtmpActive = rtmpStatus === "streaming" || rtmpStatus === "starting";

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
            onClick={() => setShowCreateForm(true)}
            style={{
              padding: "4px 8px", fontSize: s(11), backgroundColor: "#ff0000",
              color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer",
            }}
          >
            + {pick("新建直播", "New")}
          </button>
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

          {/* Broadcast control buttons */}
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

          {/* RTMP streaming controls */}
          {hasRtmp && activeBc.boundStreamId && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {/* Stream status indicator */}
              {isRtmpActive && (
                <div style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "6px 10px", backgroundColor: rtmpStatus === "streaming" ? "#e8f5e9" : "#fff3e0",
                  borderRadius: "4px", fontSize: s(11),
                }}>
                  <span style={{ color: rtmpStatus === "streaming" ? "#4caf50" : "#ff9800" }}>
                    {rtmpStatus === "streaming" ? "●" : "◌"}
                  </span>
                  <span style={{ color: "#555" }}>
                    {rtmpStatus === "streaming"
                      ? pick("正在推流到 YouTube", "Pushing to YouTube")
                      : pick("FFmpeg 啟動中…", "FFmpeg starting…")}
                  </span>
                </div>
              )}

              {/* No capture source warning */}
              {!activeStream && !isRtmpActive && (
                <div style={{ fontSize: s(10), color: "#999", fontStyle: "italic" }}>
                  {pick("請先在錄影區塊開始擷取來源", "Start a capture source in Video Capture block first")}
                </div>
              )}

              {/* Start / Stop streaming button */}
              {isRtmpActive ? (
                <button
                  onClick={stopRtmpStream}
                  style={{
                    padding: "8px", fontSize: s(12), fontWeight: 600,
                    backgroundColor: "#e53935", color: "#fff", border: "none",
                    borderRadius: "6px", cursor: "pointer",
                  }}
                >
                  {pick("■ 停止推流", "■ Stop Streaming")}
                </button>
              ) : (
                <button
                  onClick={() => startRtmpStream(activeBc)}
                  disabled={!activeStream || rtmpStarting}
                  style={{
                    padding: "8px", fontSize: s(12), fontWeight: 600,
                    backgroundColor: activeStream ? "#e65100" : "#ccc",
                    color: "#fff", border: "none", borderRadius: "6px",
                    cursor: activeStream && !rtmpStarting ? "pointer" : "default",
                    opacity: activeStream && !rtmpStarting ? 1 : 0.5,
                  }}
                >
                  {rtmpStarting
                    ? pick("啟動中…", "Starting…")
                    : pick("▶ 開始推流", "▶ Start Streaming")}
                </button>
              )}
            </div>
          )}
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

      {/* Create broadcast form */}
      {showCreateForm && (
        <div style={{
          padding: "12px", backgroundColor: "#fafafa", borderRadius: "8px",
          border: "1px solid #e0e0e0", display: "flex", flexDirection: "column", gap: "8px",
        }}>
          <div style={{ fontSize: s(12), fontWeight: 600, color: "#333" }}>
            {pick("新建直播", "New Broadcast")}
          </div>
          <input
            type="text"
            placeholder={pick("直播標題", "Broadcast title")}
            value={createTitle}
            onChange={(e) => setCreateTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            style={{
              padding: "7px 10px", fontSize: s(12), border: "1px solid #ddd",
              borderRadius: "6px", outline: "none", width: "100%", boxSizing: "border-box",
            }}
          />
          <select
            value={createPrivacy}
            onChange={(e) => setCreatePrivacy(e.target.value as "public" | "private" | "unlisted")}
            style={{
              padding: "7px 10px", fontSize: s(12), border: "1px solid #ddd",
              borderRadius: "6px", backgroundColor: "#fff", cursor: "pointer",
            }}
          >
            <option value="private">{pick("私人", "Private")}</option>
            <option value="unlisted">{pick("不公開", "Unlisted")}</option>
            <option value="public">{pick("公開", "Public")}</option>
          </select>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={handleCreate}
              disabled={creating || !createTitle.trim()}
              style={{
                flex: 1, padding: "8px", fontSize: s(12), fontWeight: 600,
                backgroundColor: createTitle.trim() && !creating ? "#ff0000" : "#ccc",
                color: "#fff", border: "none", borderRadius: "6px",
                cursor: createTitle.trim() && !creating ? "pointer" : "default",
              }}
            >
              {creating ? pick("建立中…", "Creating…") : pick("建立", "Create")}
            </button>
            <button
              onClick={() => { setShowCreateForm(false); setCreateTitle(""); }}
              disabled={creating}
              style={{
                padding: "8px 16px", fontSize: s(12), backgroundColor: "#f0f0f0",
                border: "none", borderRadius: "6px", cursor: creating ? "default" : "pointer",
                opacity: creating ? 0.5 : 1,
              }}
            >
              {pick("取消", "Cancel")}
            </button>
          </div>
        </div>
      )}

      {/* No broadcasts */}
      {!activeBc && upcomingBcs.length === 0 && !loading && !showCreateForm && (
        <div style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", color: "#bbb", fontSize: s(12), gap: "8px",
        }}>
          <div style={{ fontSize: s(24) }}>📡</div>
          <div>{pick("沒有排程或進行中的直播", "No scheduled or active broadcasts")}</div>
          <button
            onClick={() => setShowCreateForm(true)}
            style={{
              marginTop: "4px", padding: "8px 20px", fontSize: s(12), fontWeight: 600,
              backgroundColor: "#ff0000", color: "#fff", border: "none",
              borderRadius: "6px", cursor: "pointer",
            }}
          >
            + {pick("新建直播", "Create Broadcast")}
          </button>
        </div>
      )}
    </div>
  );
}
