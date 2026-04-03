import { useState, useRef, useEffect, useCallback } from "react";
import { useBlockField } from "../hooks/useBlockField";
import { loadJSON, saveJSON } from "../utils/storage";
import type { Block } from "../types";

interface SavedVideo {
  id: string;
  filename: string;
  duration: string;
  format: string;
  date: string;
  blobUrl?: string;
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
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
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsStreaming(false);
    setStreamStats({ fps: "—", res: "—" });
  }, []);

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Toolbar: Camera tabs + Mic select */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px",
          backgroundColor: "#f5f5f5",
          borderRadius: "4px",
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setCamSource("builtin")}
            style={{
              padding: "6px 12px",
              fontSize: "12px",
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
              fontSize: "12px",
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
          <span style={{ fontSize: "12px" }}>Mic</span>
          <select
            value={micSource}
            onChange={(e) => setMicSource(e.target.value)}
            style={{
              padding: "4px 8px",
              fontSize: "12px",
              border: "1px solid #ddd",
              borderRadius: "2px",
            }}
          >
            <option value="default">Default</option>
            <option value="dji">DJI</option>
            <option value="ssl2">SSL 2</option>
          </select>
        </div>
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
            objectFit: "cover",
            display: isStreaming ? "block" : "none",
          }}
        />

        {!isStreaming && (
          <div
            style={{
              textAlign: "center",
              color: "#999",
              fontSize: "12px",
            }}
          >
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>📷</div>
            <div>Click Stream to start camera</div>
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
              fontSize: "12px",
              fontWeight: "bold",
              textShadow: "0 1px 2px rgba(0,0,0,0.8)",
            }}
          >
            ● REC {formatRecTime(recSeconds)}
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
            onClick={isStreaming ? stopStream : startStream}
            style={{
              padding: "6px 12px",
              fontSize: "12px",
              backgroundColor: isStreaming ? "#e53935" : "#4caf50",
              color: "#fff",
              border: "none",
              borderRadius: "2px",
              cursor: "pointer",
            }}
          >
            {isStreaming ? "■ Stop" : "▶ Stream"}
          </button>
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!isStreaming}
            style={{
              padding: "6px 12px",
              fontSize: "12px",
              backgroundColor: isRecording ? "#ff0000" : "#555",
              color: "#fff",
              border: "none",
              borderRadius: "2px",
              cursor: isStreaming ? "pointer" : "default",
              opacity: isStreaming ? 1 : 0.5,
            }}
          >
            {isRecording ? "■ Stop" : "⏺ Rec"}
          </button>
          <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
            <button
              onClick={() => setEditOpen(!editOpen)}
              style={{
                padding: "4px 8px",
                fontSize: "12px",
                backgroundColor: editOpen ? "#333" : "#555",
                color: "#fff",
                border: "none",
                borderRadius: "2px",
                cursor: "pointer",
              }}
              title="Edit"
            >
              ⚙
            </button>
            <button
              onClick={() => setStatsAdv(!statsAdv)}
              style={{
                padding: "4px 8px",
                fontSize: "12px",
                backgroundColor: statsAdv ? "#333" : "#555",
                color: "#fff",
                border: "none",
                borderRadius: "2px",
                cursor: "pointer",
              }}
              title="Stats"
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
            fontSize: "11px",
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
              <span style={{ fontSize: "11px", width: "55px", textTransform: "capitalize" }}>
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
              <span style={{ fontSize: "10px", width: "30px" }}>{filters[prop]}%</span>
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
                  fontSize: "11px",
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
              fontSize: "12px",
              fontWeight: "500",
              marginBottom: "8px",
            }}
          >
            Saved videos ({savedVideos.length})
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
                  fontSize: "11px",
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
                      fontSize: "10px",
                    }}
                  >
                    {video.format}
                  </span>
                  <button
                    onClick={() => deleteVideo(video.id)}
                    style={{
                      padding: "2px 6px",
                      fontSize: "10px",
                      color: "#999",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                    title="Delete"
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
