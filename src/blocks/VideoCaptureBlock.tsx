import { useState, useRef, useEffect, useCallback } from "react";
import { useBlockField } from "../hooks/useBlockField";
import { useLang } from "../hooks/useLang";
import { pick } from "../utils/i18n";
import type { Block } from "../types";
import { useScreenPermission } from "../hooks/video-capture/useScreenPermission";
import { useDeviceEnumeration } from "../hooks/video-capture/useDeviceEnumeration";
import { useCompositeCanvas } from "../hooks/video-capture/useCompositeCanvas";
import { usePipCamera } from "../hooks/video-capture/usePipCamera";
import { useCameraStream } from "../hooks/video-capture/useCameraStream";
import { useScreenStream } from "../hooks/video-capture/useScreenStream";
import { useSourceSwitcher } from "../hooks/video-capture/useSourceSwitcher";
import { useRecording } from "../hooks/video-capture/useRecording";
import { usePipDrag } from "../hooks/video-capture/usePipDrag";
import { useStreamStore } from "../stores/useStreamStore";

interface VideoCaptureBlockProps {
  block: Block;
}

/* ── PipPreviewVideo: extracted child component (JW-29) ── */
function PipPreviewVideo({ stream }: { stream: MediaStream | null }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
      if (stream) ref.current.play().catch((err) => console.warn("PiP preview play failed:", err));
    }
  }, [stream]);
  return (
    <video
      ref={ref}
      muted
      playsInline
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        borderRadius: "8px",
      }}
    />
  );
}

/**
 * Video Capture block - live streaming and recording with file export.
 * Supports camera mode, screen mode, and PiP (screen + camera overlay).
 * Uses real device enumeration via enumerateDevices().
 */
export function VideoCaptureBlock({ block }: VideoCaptureBlockProps) {
  useLang();
  const [captureMode, setCaptureMode] = useBlockField<"camera" | "screen">(block.id, "capture-mode", "camera");
  const [screenSysAudio, setScreenSysAudio] = useBlockField(block.id, "screen-sys-audio", true);
  const [screenMicOn, setScreenMicOn] = useBlockField(block.id, "screen-mic", false);
  const [pipEnabled, setPipEnabled] = useBlockField(block.id, "pip-enabled", false);
  const [pipPosition, setPipPosition] = useBlockField<{ x: number; y: number }>(block.id, "pip-position", { x: 0.8, y: 0.8 });
  const [selectedCamId, setSelectedCamId] = useBlockField(block.id, "selected-cam-id", "");
  const [selectedMicId, setSelectedMicId] = useBlockField(block.id, "selected-mic-id", "");

  const [editOpen, setEditOpen] = useState(false);
  const [statsAdv, setStatsAdv] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [filters, setFilters] = useState({ brightness: 100, contrast: 100, saturation: 100 });
  const { cameras, mics, enumerateDevicesNow } = useDeviceEnumeration();
  const { screenPermDenied, openScreenRecordingSettings } = useScreenPermission();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recStartRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micGainRef = useRef<GainNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const captureModeRef = useRef(captureMode);

  // PiP refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pipVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const pipStreamRef = useRef<MediaStream | null>(null);
  const compositeStreamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const pipPositionRef = useRef(pipPosition);
  const pipDragRef = useRef<{ dragging: boolean; offsetX: number; offsetY: number }>({ dragging: false, offsetX: 0, offsetY: 0 });
  const stageRef = useRef<HTMLDivElement>(null);
  const stopPipCameraRef = useRef<() => void>(() => {});

  // Keep captureModeRef in sync for use inside recorder.onstop closure
  useEffect(() => { captureModeRef.current = captureMode; }, [captureMode]);

  // Keep pipPositionRef in sync so RAF loop reads fresh position (BUG 1 fix)
  useEffect(() => { pipPositionRef.current = pipPosition; }, [pipPosition]);

  const { isRecording, setIsRecording, recSeconds, savedVideos, startRecording, stopRecording, deleteVideo, formatRecTime } = useRecording({
    blockId: block.id,
    captureMode,
    pipEnabled,
    streamRef,
    compositeStreamRef,
    recorderRef,
    chunksRef,
    recTimerRef,
    recStartRef,
    captureModeRef,
  });

  const { isStreaming, setIsStreaming, streamStats, setStreamStats, startStream, stopStream } = useCameraStream({
    selectedCamId,
    selectedMicId,
    videoRef,
    screenVideoRef,
    streamRef,
    micStreamRef,
    audioCtxRef,
    micGainRef,
    recorderRef,
    recTimerRef,
    enumerateDevicesNow,
    stopPipCameraRef,
    onRecordingStop: () => { setIsRecording(false); setMicMuted(false); },
  });

  const { startCompositeLoop, stopCompositeLoop } = useCompositeCanvas({
    canvasRef,
    screenVideoRef,
    pipVideoRef,
    pipPositionRef,
    rafRef,
    compositeStreamRef,
  });

  const { isPipActive, stopPipCamera } = usePipCamera({
    selectedCamId,
    pipEnabled,
    isStreaming,
    captureMode,
    pipVideoRef,
    pipStreamRef,
    canvasRef,
    compositeStreamRef,
    enumerateDevicesNow,
    startCompositeLoop,
    stopCompositeLoop,
  });

  // Keep stopPipCameraRef in sync so useCameraStream.stopStream can call the real stopPipCamera
  useEffect(() => { stopPipCameraRef.current = stopPipCamera; }, [stopPipCamera]);

  // Cleanup on unmount (JW-28)
  // Refs are read at cleanup time intentionally — they are null on mount, only populated during streaming
  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      streamRef.current?.getTracks().forEach((t) => t.stop());
      // eslint-disable-next-line react-hooks/exhaustive-deps
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      // eslint-disable-next-line react-hooks/exhaustive-deps
      audioCtxRef.current?.close();
      // eslint-disable-next-line react-hooks/exhaustive-deps
      pipStreamRef.current?.getTracks().forEach((t) => t.stop());
      // eslint-disable-next-line react-hooks/exhaustive-deps
      compositeStreamRef.current?.getTracks().forEach((t) => t.stop());
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const { startScreenStream } = useScreenStream({
    screenSysAudio,
    screenMicOn,
    selectedMicId,
    videoRef,
    screenVideoRef,
    streamRef,
    micStreamRef,
    audioCtxRef,
    micGainRef,
    setIsStreaming,
    setStreamStats,
    stopStream,
    enumerateDevicesNow,
  });

  const {
    screenSources, showSourcePicker, setShowSourcePicker, setScreenSources,
    isElectron, openSourcePicker, handleScreenStreamClick, switchSource, pickSource,
  } = useSourceSwitcher({
    isStreaming,
    selectedCamId,
    setCaptureMode,
    setStreamStats,
    videoRef,
    screenVideoRef,
    streamRef,
    stopStream,
    startStream,
    startScreenStream,
  });

  const { handlePipDragStart, pipOverlayStyle } = usePipDrag({
    pipPosition,
    setPipPosition,
    pipDragRef,
    stageRef,
  });

  // Live mic mute/unmute
  const toggleMicMute = useCallback(() => {
    const newMuted = !micMuted;
    if (captureMode === "screen" && micGainRef.current) {
      micGainRef.current.gain.value = newMuted ? 0 : 1;
    } else if (captureMode === "camera" && streamRef.current) {
      streamRef.current.getAudioTracks().forEach((t) => { t.enabled = !newMuted; });
    }
    setMicMuted(newMuted);
    useStreamStore.getState().setMicMuted(newMuted);
  }, [micMuted, captureMode, streamRef]);

  // Register streaming state and callbacks in global store for FloatingStreamControls
  // EFFECT-DEPS-STABILIZATION: deps limited to lifecycle boundary; adding registered values causes register→cleanup loop
  useEffect(() => {
    const s = useStreamStore.getState();
    if (isStreaming) {
      s.setIsStreaming(true);
      s.setCaptureMode(captureMode);
      s.setOpenSourcePicker(openSourcePicker);
      s.setToggleMicMute(toggleMicMute);
      s.setPickSource((id, mode) => pickSource(id, mode));
      s.setCameras(cameras);
      s.setCloseSourcePicker(() => {
        setShowSourcePicker(false);
        setScreenSources([]);
        useStreamStore.getState().setShowSourcePicker(false);
        useStreamStore.getState().setScreenSources([]);
      });
    }
    return () => {
      s.setIsStreaming(false);
      s.setCaptureMode(null);
      s.setOpenSourcePicker(null);
      s.setToggleMicMute(null);
      s.setMicMuted(false);
      s.setPickSource(null);
      s.setCameras([]);
      s.setCloseSourcePicker(null);
      s.setShowSourcePicker(false);
      s.setScreenSources([]);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- EFFECT-DEPS-STABILIZATION: lifecycle boundary only
  }, [isStreaming]);

  /* ── Helper: device label with fallback ── */
  const deviceLabel = (dev: MediaDeviceInfo, idx: number, kind: "cam" | "mic") => {
    const base = dev.label || (kind === "cam" ? `${pick("攝影機", "Camera")} ${idx + 1}` : `${pick("麥克風", "Mic")} ${idx + 1}`);
    return dev.deviceId === "default" ? `${base} ${pick("(預設)", "(Default)")}` : base;
  };

  const modeToggleBtn = (mode: "camera" | "screen", label: string) => (
    <button
      onClick={() => {
        if (captureMode === mode) return;
        if (isStreaming) {
          // Seamless switch — replace video track without stopping recording
          switchSource({ mode });
        } else {
          setCaptureMode(mode);
        }
      }}
      style={{
        padding: "6px 12px",
        fontSize: "calc(12px * var(--text-scale))",
        backgroundColor: captureMode === mode ? "#333" : "#ddd",
        color: captureMode === mode ? "#fff" : "#000",
        border: "none",
        borderRadius: "2px",
        cursor: "pointer",
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

  const pipStream = pipStreamRef.current;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Screen recording permission banner — shown after app update resets TCC permissions */}
      {screenPermDenied && (
        <div style={{
          padding: "8px 12px",
          background: "#fff3cd",
          border: "1px solid #ffc107",
          borderRadius: "6px",
          fontSize: "12px",
          lineHeight: 1.5,
        }}>
          <strong>{pick("螢幕錄影權限未開啟", "Screen recording permission is off")}</strong>
          <br />
          {pick(
            "這不是你的操作問題。macOS 有時會把權限關掉，點下面按鈕直接開啟設定再勾選 Jonah Workspace。",
            "macOS sometimes turns this off. Click below to open Settings, then re-enable Jonah Workspace."
          )}
          <div style={{ marginTop: "8px" }}>
            <button
              type="button"
              onClick={openScreenRecordingSettings}
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid #d39e00",
                background: "#fff8e1",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              {pick("打開系統設定", "Open System Settings")}
            </button>
          </div>
        </div>
      )}
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
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {/* Camera device select */}
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "calc(12px * var(--text-scale))", minWidth: "50px" }}>
                {pick("鏡頭", "Camera")}
              </span>
              <select
                value={selectedCamId}
                onChange={(e) => setSelectedCamId(e.target.value)}
                style={{
                  flex: 1,
                  padding: "4px 8px",
                  fontSize: "calc(12px * var(--text-scale))",
                  border: "1px solid #ddd",
                  borderRadius: "2px",
                }}
              >
                <option value="">{pick("系統預設", "System Default")}</option>
                {cameras.map((cam, i) => (
                  <option key={cam.deviceId} value={cam.deviceId}>
                    {deviceLabel(cam, i, "cam")}
                  </option>
                ))}
              </select>
            </div>
            {/* Mic device select */}
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "calc(12px * var(--text-scale))", minWidth: "50px" }}>
                {pick("麥克風", "Mic")}
              </span>
              <select
                value={selectedMicId}
                onChange={(e) => setSelectedMicId(e.target.value)}
                style={{
                  flex: 1,
                  padding: "4px 8px",
                  fontSize: "calc(12px * var(--text-scale))",
                  border: "1px solid #ddd",
                  borderRadius: "2px",
                }}
              >
                <option value="">{pick("系統預設", "System Default")}</option>
                {mics.map((mic, i) => (
                  <option key={mic.deviceId} value={mic.deviceId}>
                    {deviceLabel(mic, i, "mic")}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {/* Audio toggles row */}
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              {audioToggleBtn(screenSysAudio, () => setScreenSysAudio(!screenSysAudio), pick("系統音訊", "System Audio"))}
              {/* Mic: live mute/unmute when streaming (with mic on), toggle on/off when not streaming */}
              {isStreaming && screenMicOn ? (
                <button
                  onClick={toggleMicMute}
                  style={{
                    padding: "6px 12px",
                    fontSize: "calc(12px * var(--text-scale))",
                    backgroundColor: micMuted ? "#c62828" : "#333",
                    color: "#fff",
                    border: "none",
                    borderRadius: "2px",
                    cursor: "pointer",
                  }}
                >
                  {micMuted ? pick("🔇 靜音中", "🔇 Muted") : pick("🎙 麥克風", "🎙 Mic On")}
                </button>
              ) : isStreaming && !screenMicOn ? (
                <span style={{ fontSize: "calc(10px * var(--text-scale))", color: "#aaa" }}>
                  {pick("重新串流以加入麥克風", "Restart to add mic")}
                </span>
              ) : (
                audioToggleBtn(screenMicOn, () => setScreenMicOn(!screenMicOn), pick("麥克風", "Microphone"))
              )}
              {/* PiP toggle */}
              <button
                onClick={() => { if (!isRecording) setPipEnabled(!pipEnabled); }}
                disabled={isRecording}
                style={{
                  padding: "6px 12px",
                  fontSize: "calc(12px * var(--text-scale))",
                  backgroundColor: pipEnabled ? "#1565c0" : "#ddd",
                  color: pipEnabled ? "#fff" : "#000",
                  border: "none",
                  borderRadius: "2px",
                  cursor: isRecording ? "not-allowed" : "pointer",
                  opacity: isRecording ? 0.5 : 1,
                }}
              >
                {pick("子母畫面", "PiP")}
              </button>
              {/* Switch source button (Electron, while streaming) */}
              {isElectron && isStreaming && (
                <button
                  onClick={openSourcePicker}
                  style={{
                    padding: "6px 12px",
                    fontSize: "calc(12px * var(--text-scale))",
                    backgroundColor: "#555",
                    color: "#fff",
                    border: "none",
                    borderRadius: "2px",
                    cursor: "pointer",
                  }}
                >
                  {pick("切換來源", "Switch Source")}
                </button>
              )}
            </div>
            {/* Mic device select when mic is enabled in screen mode */}
            {screenMicOn && (
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span style={{ fontSize: "calc(12px * var(--text-scale))", minWidth: "50px" }}>
                  {pick("麥克風", "Mic")}
                </span>
                <select
                  value={selectedMicId}
                  onChange={(e) => setSelectedMicId(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "4px 8px",
                    fontSize: "calc(12px * var(--text-scale))",
                    border: "1px solid #ddd",
                    borderRadius: "2px",
                  }}
                >
                  <option value="">{pick("系統預設", "System Default")}</option>
                  {mics.map((mic, i) => (
                    <option key={mic.deviceId} value={mic.deviceId}>
                      {deviceLabel(mic, i, "mic")}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {/* Camera device select when PiP is enabled */}
            {pipEnabled && (
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span style={{ fontSize: "calc(12px * var(--text-scale))", minWidth: "50px" }}>
                  {pick("鏡頭", "Camera")}
                </span>
                <select
                  value={selectedCamId}
                  onChange={(e) => setSelectedCamId(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "4px 8px",
                    fontSize: "calc(12px * var(--text-scale))",
                    border: "1px solid #ddd",
                    borderRadius: "2px",
                  }}
                >
                  <option value="">{pick("系統預設", "System Default")}</option>
                  {cameras.map((cam, i) => (
                    <option key={cam.deviceId} value={cam.deviceId}>
                      {deviceLabel(cam, i, "cam")}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Video stage — always 16:9 regardless of block width */}
      <div
        ref={stageRef}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16 / 9",
          backgroundColor: "#000",
          borderRadius: "4px",
          overflow: "hidden",
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

        {/* Offscreen elements for canvas compositing — avoid display:none which can block video decoding */}
        <video ref={screenVideoRef} autoPlay muted playsInline style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }} />
        <video ref={pipVideoRef} autoPlay muted playsInline style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }} />
        <canvas ref={canvasRef} style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }} />

        {/* PiP overlay (draggable preview) */}
        {pipEnabled && isStreaming && captureMode === "screen" && isPipActive && (
          <div
            style={pipOverlayStyle()}
            onMouseDown={handlePipDragStart}
            onTouchStart={handlePipDragStart}
          >
            <PipPreviewVideo stream={pipStream} />
          </div>
        )}

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
            ● {captureMode === "screen" ? (pipEnabled ? "PiP" : "SCR") : "REC"} {formatRecTime(recSeconds)}
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
            onClick={isStreaming ? () => { stopStream(); setMicMuted(false); } : (captureMode === "screen" ? handleScreenStreamClick : startStream)}
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
            disabled={!isStreaming || (captureMode === "screen" && pipEnabled && !isPipActive)}
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
      {/* Screen source picker modal (Electron only) */}
      {showSourcePicker && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.85)",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            padding: "16px",
            borderRadius: "4px",
            overflow: "auto",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ color: "#fff", fontSize: "calc(14px * var(--text-scale, 1))", fontWeight: 600 }}>
              {pick("選擇來源", "Choose Source")}
            </span>
            <button
              onClick={() => { setShowSourcePicker(false); setScreenSources([]); }}
              style={{ background: "none", border: "none", color: "#999", fontSize: "calc(18px * var(--text-scale, 1))", cursor: "pointer" }}
            >
              ✕
            </button>
          </div>

          {/* Camera sources */}
          {cameras.length > 0 && (
            <>
              <div style={{ color: "#aaa", fontSize: "calc(11px * var(--text-scale, 1))", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {pick("攝影機", "Camera")}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px", marginBottom: "16px" }}>
                {cameras.map((cam, i) => (
                  <button
                    key={cam.deviceId}
                    onClick={() => pickSource(cam.deviceId, "camera")}
                    style={{
                      background: "none",
                      border: "2px solid #555",
                      borderRadius: "8px",
                      padding: "12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      transition: "border-color 0.15s",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#4caf50"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#555"; }}
                  >
                    <span style={{ fontSize: "calc(18px * var(--text-scale, 1))" }}>📷</span>
                    <span style={{ color: "#ccc", fontSize: "calc(11px * var(--text-scale, 1))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {deviceLabel(cam, i, "cam")}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Screen/window sources */}
          <div style={{ color: "#aaa", fontSize: "calc(11px * var(--text-scale, 1))", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {pick("螢幕 / 視窗", "Screen / Window")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
            {screenSources.map((src) => (
              <button
                key={src.id}
                onClick={() => pickSource(src.id, "screen")}
                style={{
                  background: "none",
                  border: "2px solid #555",
                  borderRadius: "8px",
                  padding: "8px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "8px",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#4caf50"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#555"; }}
              >
                <img
                  src={src.thumbnail}
                  alt={src.name}
                  style={{ width: "100%", borderRadius: "4px", objectFit: "contain" }}
                />
                <span style={{
                  color: "#ccc",
                  fontSize: "calc(11px * var(--text-scale, 1))",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  width: "100%",
                  textAlign: "center",
                }}>
                  {src.id.startsWith("screen:") ? pick("整個螢幕", "Entire Screen") : src.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
