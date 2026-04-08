import { useState, useRef } from "react";
import { useLang } from "../hooks/useLang";
import { pick } from "../utils/i18n";
import { getStoredTokens } from "../utils/youtubeApi";
import { useStreamStore } from "../stores/useStreamStore";
import type { Block } from "../types";
import { statusColor, statusLabel, healthLabel, healthColor, formatDate } from "../utils/youtubeFormatters";
import { useYouTubeBitrate } from "../hooks/youtube/useYouTubeBitrate";
import { useYouTubeAuth } from "../hooks/youtube/useYouTubeAuth";
import { useRtmpStream } from "../hooks/youtube/useRtmpStream";
import { useYouTubePolling } from "../hooks/youtube/useYouTubePolling";
import { useYouTubeBroadcastLifecycle } from "../hooks/youtube/useYouTubeBroadcastLifecycle";

interface YouTubeStudioBlockProps {
  block: Block;
}

export function YouTubeStudioBlock({ block }: YouTubeStudioBlockProps) {
  useLang();
  const [error, setError] = useState<string | null>(null);
  const [authed, setAuthed] = useState(() => getStoredTokens() !== null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeStream = useStreamStore((s) => s.activeStream);

  const { bitrate, bitrateRef, handleBitrateChange } = useYouTubeBitrate();
  const { rtmpStatus, rtmpStarting, hasRtmp, startRtmpStream, stopRtmpStream } = useRtmpStream({ bitrateRef, setError });
  const { broadcasts, setBroadcasts, streamHealth, setStreamHealth, loading, refresh } = useYouTubePolling({ authed, rtmpStatus, pollRef, setError });
  const { isElectron, handleConnect, handleDisconnect } = useYouTubeAuth({ setAuthed, setError, pollRef, setBroadcasts, setStreamHealth });
  const {
    transitioning,
    showCreateForm, setShowCreateForm,
    createTitle, setCreateTitle,
    createPrivacy, setCreatePrivacy,
    creating,
    selectedId, setSelectedId,
    editingId, setEditingId,
    editPrivacy, setEditPrivacy,
    editSaving,
    deletingId,
    handleTransition,
    handleCreate,
    handleUpdatePrivacy,
    handleDelete,
  } = useYouTubeBroadcastLifecycle({ refresh, setError });

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
  ) ?? null;
  const selectedBc = selectedId ? broadcasts.find((b) => b.id === selectedId) ?? null : null;
  const displayedBc = activeBc ?? selectedBc;
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

      {/* Active / selected broadcast */}
      {displayedBc && (
        <div style={{
          padding: "12px", backgroundColor: "#fafafa", borderRadius: "8px",
          border: `2px solid ${statusColor(displayedBc.lifeCycleStatus)}`,
          display: "flex", flexDirection: "column", gap: "10px",
        }}>
          {/* Title + status */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: s(14), fontWeight: 600, color: "#222", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {displayedBc.title || pick("未命名直播", "Untitled broadcast")}
            </span>
            <span style={{
              padding: "3px 10px", fontSize: s(10), fontWeight: 700,
              backgroundColor: statusColor(displayedBc.lifeCycleStatus),
              color: "#fff", borderRadius: "12px", textTransform: "uppercase",
            }}>
              {statusLabel(displayedBc.lifeCycleStatus)}
            </span>
          </div>

          {/* Viewers */}
          {displayedBc.lifeCycleStatus === "live" && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ color: "#ff0000", fontSize: s(12) }}>●</span>
              <span style={{ fontSize: s(13), fontWeight: 600, color: "#333" }}>
                {displayedBc.concurrentViewers ?? "0"}
              </span>
              <span style={{ fontSize: s(11), color: "#888" }}>
                {pick("位觀眾", "watching")}
              </span>
            </div>
          )}

          {/* Bitrate selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: s(11) }}>
            <span style={{ color: "#999", flexShrink: 0 }}>{pick("碼率", "Bitrate")}:</span>
            {([
              { label: "720p / 2.5M", bps: 2_500_000 },
              { label: "1080p / 4.5M", bps: 4_500_000 },
              { label: "1080p HQ / 8M", bps: 8_000_000 },
            ] as { label: string; bps: number }[]).map(({ label, bps }) => (
              <button
                key={bps}
                onClick={() => handleBitrateChange(bps)}
                style={{
                  padding: "2px 8px",
                  borderRadius: 4,
                  border: "1px solid",
                  borderColor: bitrate === bps ? "var(--accent, #4f9cf9)" : "var(--line, #e0e0e0)",
                  background: bitrate === bps ? "var(--accent, #4f9cf9)" : "transparent",
                  color: bitrate === bps ? "#fff" : "inherit",
                  cursor: "pointer",
                  fontSize: s(10),
                }}
              >
                {label}
              </button>
            ))}
          </div>

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
            {displayedBc.lifeCycleStatus === "ready" && (
              <button
                onClick={() => handleTransition(displayedBc.id, "testing")}
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
            {(displayedBc.lifeCycleStatus === "testing" || displayedBc.lifeCycleStatus === "ready") && (
              <button
                onClick={() => handleTransition(displayedBc.id, "live")}
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
            {displayedBc.lifeCycleStatus === "live" && (
              <button
                onClick={() => handleTransition(displayedBc.id, "complete")}
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

          {/* Workflow hint for ready broadcasts */}
          {displayedBc.lifeCycleStatus === "ready" && (
            <div style={{ fontSize: s(10), color: "#aaa", fontStyle: "italic", lineHeight: "1.5" }}>
              {pick(
                "▶ 先點「開始推流」→ 等待串流就緒 → 再點「開始預覽」或「開始直播」",
                "▶ Start Streaming first → wait for stream to be ready → then Start Preview or Go Live"
              )}
            </div>
          )}

          {/* RTMP streaming controls */}
          {hasRtmp && displayedBc.boundStreamId && (
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
                  onClick={() => startRtmpStream(displayedBc)}
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
            <div key={bc.id} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div
                onClick={() => setSelectedId(bc.id)}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 10px", borderRadius: "6px", cursor: "pointer",
                  backgroundColor: bc.id === selectedId ? "#e3f2fd" : "#f9f9f9",
                  borderLeft: bc.id === selectedId ? "3px solid #2196f3" : "3px solid transparent",
                  gap: "6px",
                }}
              >
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ fontSize: s(12), fontWeight: 500, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {bc.title || pick("未命名", "Untitled")}
                  </div>
                  <div style={{ fontSize: s(10), color: "#999" }}>
                    {formatDate(bc.scheduledStartTime)}
                  </div>
                </div>
                <span style={{
                  padding: "2px 8px", fontSize: s(9), fontWeight: 600,
                  backgroundColor: statusColor(bc.lifeCycleStatus),
                  color: "#fff", borderRadius: "10px", flexShrink: 0,
                }}>
                  {statusLabel(bc.lifeCycleStatus)}
                </span>
                {/* Edit button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(editingId === bc.id ? null : bc.id);
                    setEditPrivacy(bc.privacyStatus as "public" | "private" | "unlisted");
                  }}
                  title={pick("編輯可見度", "Edit visibility")}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    padding: "2px 4px", fontSize: s(13), lineHeight: 1,
                    color: editingId === bc.id ? "#2196f3" : "#aaa",
                    flexShrink: 0,
                  }}
                >
                  ✏️
                </button>
                {/* Delete button */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(bc.id); }}
                  disabled={deletingId === bc.id}
                  title={pick("刪除直播", "Delete broadcast")}
                  style={{
                    background: "none", border: "none", cursor: deletingId === bc.id ? "default" : "pointer",
                    padding: "2px 4px", fontSize: s(13), lineHeight: 1,
                    color: "#f44336", opacity: deletingId === bc.id ? 0.4 : 1,
                    flexShrink: 0,
                  }}
                >
                  {deletingId === bc.id ? "…" : "🗑️"}
                </button>
              </div>

              {/* Inline edit panel */}
              {editingId === bc.id && (
                <div style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "8px 10px", backgroundColor: "#f0f4ff",
                  borderRadius: "6px", border: "1px solid #c5d8f8",
                }}>
                  <span style={{ fontSize: s(11), color: "#555", flexShrink: 0 }}>
                    {pick("可見度", "Visibility")}
                  </span>
                  <select
                    value={editPrivacy}
                    onChange={(e) => setEditPrivacy(e.target.value as "public" | "private" | "unlisted")}
                    style={{
                      flex: 1, padding: "4px 8px", fontSize: s(11),
                      border: "1px solid #c5d8f8", borderRadius: "5px",
                      backgroundColor: "#fff", cursor: "pointer",
                    }}
                  >
                    <option value="private">{pick("私人", "Private")}</option>
                    <option value="unlisted">{pick("不公開", "Unlisted")}</option>
                    <option value="public">{pick("公開", "Public")}</option>
                  </select>
                  <button
                    onClick={() => handleUpdatePrivacy(bc)}
                    disabled={editSaving}
                    style={{
                      padding: "4px 12px", fontSize: s(11), fontWeight: 600,
                      backgroundColor: editSaving ? "#ccc" : "#2196f3",
                      color: "#fff", border: "none", borderRadius: "5px",
                      cursor: editSaving ? "default" : "pointer", flexShrink: 0,
                    }}
                  >
                    {editSaving ? pick("儲存中…", "Saving…") : pick("儲存", "Save")}
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    disabled={editSaving}
                    style={{
                      padding: "4px 10px", fontSize: s(11),
                      backgroundColor: "#e8e8e8", border: "none",
                      borderRadius: "5px", cursor: editSaving ? "default" : "pointer",
                      flexShrink: 0,
                    }}
                  >
                    {pick("取消", "Cancel")}
                  </button>
                </div>
              )}
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
