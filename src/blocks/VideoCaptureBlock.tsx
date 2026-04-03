import { useState, useRef, useEffect, useCallback } from "react";
import { useBlockField } from "../hooks/useBlockField";
import { loadJSON, saveJSON } from "../utils/storage";
import { useLang } from "../hooks/useLang";
import { pick } from "../utils/i18n";
import type { Block } from "../types";

interface SavedVideo {
  id: string;
  filename: string;
  duration: string;
  format: string;
  date: string;
  blobUrl?: string;
  source?: "camera" | "screen";
}

interface VideoCaptureBlockProps {
  block: Block;
}

/**
 * Video Capture block - live streaming and recording with file export.
 * Fields: camera-source, mic-source, playback-speed
 * Extra storage: vc-saved-videos:{blockId}
 */
export function VideoCaptureBlock({ block }: VideoCaptureBlockProps) {
  const lang = useLang();
  const [captureMode, setCaptureMode] = useBlockField<"camera" | "screen">(block.id, "capture-mode", "camera");
  const [screenSysAudio, setScreenSysAudio] = useBlockField(block.id, "screen-sys-audio", true);
  const [screenMicOn, setScreenMicOn] = useBlockField(block.id, "screen-mic", false);
  const [camSource, setCamSource] = useBlockField(block.id, "camera-source", "builtin");
  const [micSource, setMicSource] = useBlockField(block.id, "mic-source", "default");

  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [statsAdv, setStatsAdv] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [recSeconds, setRecSeconds] = useState(0);
  const [savedVideos, setSavedVideos] = useState<SavedVideo[]>(() =>
    loadJSON(`vc-saved-videos:${block.id}`, [])
  );
  const [streamStats, setStreamStats] = useState({ fps: "—", res: "—" });
  const [filters, setFilters] = useState({ brightness: 100, contrast: 100, saturation: 100 });

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recStartRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const captureModeRef = useRef(captureMode);

  // Keep captureModeRef in sync for use inside recorder.onstop closure
  useEffect(() => { captureModeRef.current = captureMode; }, [captureMode]);

  // Cleanup on unmount (JW-28)
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
      if (recTimerRef.current) clearInterval(recTimerRef.current);
    };
  }, []);

  // Apply CSS filters to video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.style.filter =
        `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%)`;
    }
  }, [filters]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    setIsRecording(false);
    if (recTimerRef.current) {
      clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
  }, []);

  const startStream = useCallback(async () => {
    // Guard against double-start — stop existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    try {
      const videoConstraints =
        camSource === "iriun"
          ? { width: { ideal: 1920 }, height: { ideal: 1080 } }
          : { facingMode: "user" as const, width: { ideal: 1920 }, height: { ideal: 1080 } };

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: true,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsStreaming(true);

      const vTrack = stream.getVideoTracks()[0];
      if (vTrack) {
        const settings = vTrack.getSettings();
        setStreamStats({
          fps: String(settings.frameRate || "—"),
          res: settings.width && settings.height
            ? `${settings.width}×${settings.height}`
            : "—",
        });
      }
    } catch (err) {
      console.error("Camera access failed:", err);
    }
  }, [camSource]);

  const stopStream = useCallback(() => {
    // Stop recording first if active
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
      recorderRef.current = null;
      setIsRecording(false);
      if (recTimerRef.current) {
        clearInterval(recTimerRef.current);
        recTimerRef.current = null;
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    // Screen mode cleanup (JW-28)
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsStreaming(false);
    setStreamStats({ fps: "—", res: "—" });
  }, []);

  const startScreenStream = useCallback(async () => {
    // Guard: stop existing streams
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: screenSysAudio,
      });

      let finalStream: MediaStream;

      if (screenMicOn) {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = micStream;

        // Mix system audio + mic via Web Audio API
        const audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;
        const dest = audioCtx.createMediaStreamDestination();

        const sysAudioTracks = displayStream.getAudioTracks();
        if (sysAudioTracks.length > 0) {
          const sysSource = audioCtx.createMediaStreamSource(
            new MediaStream(sysAudioTracks)
          );
          sysSource.connect(dest);
        }

        const micSource = audioCtx.createMediaStreamSource(micStream);
        micSource.connect(dest);

        finalStream = new MediaStream([
          ...displayStream.getVideoTracks(),
          ...dest.stream.getAudioTracks(),
        ]);
      } else {
        finalStream = displayStream;
      }

      // Auto-stop when user clicks browser's "Stop sharing" button
      displayStream.getVideoTracks()[0]?.addEventListener("ended", () => {
        stopStream();
      });

      streamRef.current = finalStream;
      if (videoRef.current) {
        videoRef.current.srcObject = finalStream;
        videoRef.current.play();
      }
      setIsStreaming(true);

      const vTrack = displayStream.getVideoTracks()[0];
      if (vTrack) {
        const settings = vTrack.getSettings();
        setStreamStats({
          fps: String(settings.frameRate || "—"),
          res: settings.width && settings.height
            ? `${settings.width}×${settings.height}`
            : "—",
        });
      }
    } catch (err) {
      console.error("Screen capture failed:", err);
    }
  }, [screenSysAudio, screenMicOn, stopStream]);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    const mimeType = MediaRecorder.isTypeSupported("video/mp4;codecs=avc1")
      ? "video/mp4"
      : MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";

    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    const blockId = block.id;
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const ext = mimeType.includes("mp4") ? "mp4" : "webm";
      const now = new Date();
      const filename = `vc-${now.toISOString().replace(/[:.]/g, "-")}.${ext}`;
      const elapsed = Math.round((Date.now() - recStartRef.current) / 1000);
      const mins = Math.floor(elapsed / 60);
      const secs = elapsed % 60;
      const duration = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      a.click();

      const video: SavedVideo = {
        id: crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2),
        filename,
        duration,
        format: ext.toUpperCase(),
        date: now.toISOString(),
        blobUrl,
        source: captureModeRef.current,
      };
      // Use functional update to avoid stale savedVideos closure
      setSavedVideos((prev) => {
        const updated = [video, ...prev];
        saveJSON(`vc-saved-videos:${blockId}`, updated.map(({ blobUrl: _, ...rest }) => rest));
        return updated;
      });
    };

    recorder.start(1000);
    recorderRef.current = recorder;
    recStartRef.current = Date.now();
    setIsRecording(true);
    setRecSeconds(0);

    recTimerRef.current = setInterval(() => {
      setRecSeconds(Math.round((Date.now() - recStartRef.current) / 1000));
    }, 1000);
  }, [block.id]);

  const formatRecTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const deleteVideo = (id: string) => {
    const toDelete = savedVideos.find((v) => v.id === id);
    if (toDelete?.blobUrl) URL.revokeObjectURL(toDelete.blobUrl);
    const updated = savedVideos.filter((v) => v.id !== id);
    setSavedVideos(updated);
    saveJSON(`vc-saved-videos:${block.id}`, updated.map(({ blobUrl: _, ...rest }) => rest));
  };

  const modeToggleBtn = (mode: "camera" | "screen", label: string) => (
    <button
      onClick={() => { if (!isRecording) { stopStream(); setCaptureMode(mode); } }}
      disabled={isRecording}
      style={{
        padding: "6px 12px",
        fontSize: "calc(12px * var(--text-scale))",
        backgroundColor: captureMode === mode ? "#333" : "#ddd",
        color: captureMode === mode ? "#fff" : "#000",
        border: "none",
        borderRadius: "2px",
        cursor: isRecording ? "not-allowed" : "pointer",
        opacity: isRecording ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  );

  const audioToggleBtn = (active: boolean, toggle: () => void, label: string) => (
    <button
      onClick={toggle}
      disabled={isStreaming}
      style={{
        padding: "6px 12px",
        fontSize: "calc(12px * var(--text-scale))",
        backgroundColor: active ? "#333" : "#ddd",
        color: active ? "#fff" : "#000",
        border: "none",
        borderRadius: "2px",
        cursor: isStreaming ? "not-allowed" : "pointer",
        opacity: isStreaming ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          padding: "8px",
          backgroundColor: "#f5f5f5",
          borderRadius: "4px",
        }}
      >
        {/* Row 1: Mode toggle */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "4px" }}>
            {modeToggleBtn("camera", pick("攝影機", "Camera"))}
            {modeToggleBtn("screen", pick("螢幕", "Screen"))}
          </div>
        </div>

        {/* Row 2: Mode-specific controls */}
        {captureMode === "camera" ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setCamSource("builtin")}
                style={{
                  padding: "6px 12px",
                  fontSize: "calc(12px * var(--text-scale))",
                  backgroundColor: camSource === "builtin" ? "#333" : "#ddd",
                  color: camSource === "builtin" ? "#fff" : "#000",
                  border: "none",
                  borderRadius: "2px",
                  cursor: "pointer",
                }}
              >
                Built-in
              </button>
              <button
                onClick={() => setCamSource("iriun")}
                style={{
                  padding: "6px 12px",
                  fontSize: "calc(12px * var(--text-scale))",
                  backgroundColor: camSource === "iriun" ? "#333" : "#ddd",
                  color: camSource === "iriun" ? "#fff" : "#000",
                  border: "none",
                  borderRadius: "2px",
                  cursor: "pointer",
                }}
              >
                Iriun
              </button>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "calc(12px * var(--text-scale))" }}>{pick("麥克風", "Mic")}</span>
              <select
                value={micSource}
                onChange={(e) => setMicSource(e.target.value)}
                style={{
                  padding: "4px 8px",
                  fontSize: "calc(12px * var(--text-scale))",
                  border: "1px solid #ddd",
                  borderRadius: "2px",
                }}
              >
                <option value="default">{pick("預設", "Default")}</option>
                <option value="dji">DJI</option>
                <option value="ssl2">SSL 2</option>
              </select>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {audioToggleBtn(screenSysAudio, () => setScreenSysAudio(!screenSysAudio), pick("系統音訊", "System Audio"))}
            {audioToggleBtn(screenMicOn, () => setScreenMicOn(!screenMicOn), pick("麥克風", "Microphone"))}
            {isStreaming && (
              <span style={{ fontSize: "calc(10px * var(--text-scale))", color: "#999", marginLeft: "4px" }}>
                {pick("停止串流以更改音訊", "Stop stream to change audio")}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Video stage */}
      <div
        style={{
          position: "relative",
          height: "320px",
          backgroundColor: "#000",
          borderRadius: "4px",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <video
          ref={videoRef}
          muted
          playsInline
          style={{
            width: "100%",
            height: "100%",
            objectFit: captureMode === "screen" ? "contain" : "cover",
            display: isStreaming ? "block" : "none",
          }}
        />

        {!isStreaming && (
          <div
            style={{
              textAlign: "center",
              color: "#999",
              fontSize: "calc(12px * var(--text-scale))",
            }}
          >
            <div style={{ fontSize: "calc(24px * var(--text-scale))", marginBottom: "8px" }}>
              {captureMode === "screen" ? "🖥" : "📷"}
            </div>
            <div>
              {captureMode === "screen"
                ? pick("點擊串流開始螢幕錄製", "Click Stream to start screen capture")
                : pick("點擊串流開始攝影機", "Click Stream to start camera")}
            </div>
          </div>
        )}

        {/* Recording indicator overlay */}
        {isRecording && (
          <div
            style={{
              position: "absolute",
              top: "12px",
              left: "12px",
              color: "#ff0000",
              fontSize: "calc(12px * var(--text-scale))",
              fontWeight: "bold",
              textShadow: "0 1px 2px rgba(0,0,0,0.8)",
            }}
          >
            ● {captureMode === "screen" ? "SCR" : "REC"} {formatRecTime(recSeconds)}
          </div>
        )}

        {/* Control buttons overlay */}
        <div
          style={{
            position: "absolute",
            bottom: "12px",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: "8px",
            padding: "8px",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            borderRadius: "4px",
          }}
        >
          <button
            onClick={isStreaming ? stopStream : (captureMode === "screen" ? startScreenStream : startStream)}
            style={{
              padding: "6px 12px",
              fontSize: "calc(12px * var(--text-scale))",
              backgroundColor: isStreaming ? "#e53935" : "#4caf50",
              color: "#fff",
              border: "none",
              borderRadius: "2px",
              cursor: "pointer",
            }}
          >
            {isStreaming ? pick("■ 停止", "■ Stop") : pick("▶ 串流", "▶ Stream")}
          </button>
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!isStreaming}
            style={{
              padding: "6px 12px",
              fontSize: "calc(12px * var(--text-scale))",
              backgroundColor: isRecording ? "#ff0000" : "#555",
              color: "#fff",
              border: "none",
              borderRadius: "2px",
              cursor: isStreaming ? "pointer" : "default",
              opacity: isStreaming ? 1 : 0.5,
            }}
          >
            {isRecording ? pick("■ 停止", "■ Stop") : pick("⏺ 錄製", "⏺ Rec")}
          </button>
          <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
            <button
              onClick={() => setEditOpen(!editOpen)}
              style={{
                padding: "4px 8px",
                fontSize: "calc(12px * var(--text-scale))",
                backgroundColor: editOpen ? "#333" : "#555",
                color: "#fff",
                border: "none",
                borderRadius: "2px",
                cursor: "pointer",
              }}
              title={pick("編輯", "Edit")}
            >
              ⚙
            </button>
            <button
              onClick={() => setStatsAdv(!statsAdv)}
              style={{
                padding: "4px 8px",
                fontSize: "calc(12px * var(--text-scale))",
                backgroundColor: statsAdv ? "#333" : "#555",
                color: "#fff",
                border: "none",
                borderRadius: "2px",
                cursor: "pointer",
              }}
              title={pick("統計", "Stats")}
            >
              📊
            </button>
          </div>
        </div>
      </div>

      {/* Stats panel */}
      {statsAdv && (
        <div
          style={{
            padding: "8px",
            backgroundColor: "#f5f5f5",
            borderRadius: "4px",
            fontSize: "calc(11px * var(--text-scale))",
            color: "#666",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "8px",
          }}
        >
          <div>fps: {streamStats.fps}</div>
          <div>res: {streamStats.res}</div>
          <div>speed: {playbackSpeed}x</div>
        </div>
      )}

      {/* Edit panel */}
      {editOpen && (
        <div
          style={{
            padding: "8px",
            backgroundColor: "#f5f5f5",
            borderRadius: "4px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          {(["brightness", "contrast", "saturation"] as const).map((prop) => (
            <div
              key={prop}
              style={{ display: "flex", gap: "8px", alignItems: "center" }}
            >
              <span style={{ fontSize: "calc(11px * var(--text-scale))", width: "55px", textTransform: "capitalize" }}>
                {prop.slice(0, 6)}
              </span>
              <input
                type="range"
                min="0"
                max="200"
                value={filters[prop]}
                onChange={(e) =>
                  setFilters({ ...filters, [prop]: Number(e.target.value) })
                }
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: "calc(10px * var(--text-scale))", width: "30px" }}>{filters[prop]}%</span>
            </div>
          ))}
          <div style={{ display: "flex", gap: "4px" }}>
            {[0.5, 1, 1.5, 2].map((speed) => (
              <button
                key={speed}
                onClick={() => {
                  setPlaybackSpeed(speed);
                  if (videoRef.current) videoRef.current.playbackRate = speed;
                }}
                style={{
                  padding: "4px 8px",
                  fontSize: "calc(11px * var(--text-scale))",
                  backgroundColor: playbackSpeed === speed ? "#333" : "#ddd",
                  color: playbackSpeed === speed ? "#fff" : "#000",
                  border: "none",
                  borderRadius: "2px",
                  cursor: "pointer",
                  flex: 1,
                }}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Saved videos list */}
      {savedVideos.length > 0 && (
        <div
          style={{
            padding: "8px",
            backgroundColor: "#f5f5f5",
            borderRadius: "4px",
          }}
        >
          <div
            style={{
              fontSize: "calc(12px * var(--text-scale))",
              fontWeight: "500",
              marginBottom: "8px",
            }}
          >
            {pick("已儲存影片", "Saved videos")} ({savedVideos.length})
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              maxHeight: "150px",
              overflowY: "auto",
            }}
          >
            {savedVideos.map((video) => (
              <div
                key={video.id}
                style={{
                  padding: "6px 8px",
                  backgroundColor: "#fff",
                  borderRadius: "2px",
                  fontSize: "calc(11px * var(--text-scale))",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {video.filename}
                </span>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
                  <span style={{ color: "#999" }}>{video.duration}</span>
                  <span
                    style={{
                      padding: "2px 4px",
                      backgroundColor: "#e0e0e0",
                      borderRadius: "2px",
                      fontSize: "calc(10px * var(--text-scale))",
                    }}
                  >
                    {video.format}
                  </span>
                  {video.source && (
                    <span
                      style={{
                        padding: "2px 4px",
                        backgroundColor: video.source === "screen" ? "#e3f2fd" : "#f3e5f5",
                        borderRadius: "2px",
                        fontSize: "calc(10px * var(--text-scale))",
                        color: video.source === "screen" ? "#1565c0" : "#7b1fa2",
                      }}
                    >
                      {video.source === "screen" ? pick("螢幕", "SCR") : pick("攝影機", "CAM")}
                    </span>
                  )}
                  <button
                    onClick={() => deleteVideo(video.id)}
                    style={{
                      padding: "2px 6px",
                      fontSize: "calc(10px * var(--text-scale))",
                      color: "#999",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                    title={pick("刪除", "Delete")}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
