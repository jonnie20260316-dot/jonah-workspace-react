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
  const lang = useLang();
  const [captureMode, setCaptureMode] = useBlockField<"camera" | "screen">(block.id, "capture-mode", "camera");
  const [screenSysAudio, setScreenSysAudio] = useBlockField(block.id, "screen-sys-audio", true);
  const [screenMicOn, setScreenMicOn] = useBlockField(block.id, "screen-mic", false);
  const [pipEnabled, setPipEnabled] = useBlockField(block.id, "pip-enabled", false);
  const [pipPosition, setPipPosition] = useBlockField<{ x: number; y: number }>(block.id, "pip-position", { x: 0.8, y: 0.8 });
  const [selectedCamId, setSelectedCamId] = useBlockField(block.id, "selected-cam-id", "");
  const [selectedMicId, setSelectedMicId] = useBlockField(block.id, "selected-mic-id", "");

  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [statsAdv, setStatsAdv] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [recSeconds, setRecSeconds] = useState(0);
  const [savedVideos, setSavedVideos] = useState<SavedVideo[]>(() =>
    loadJSON(`vc-saved-videos:${block.id}`, [])
  );
  const [isPipActive, setIsPipActive] = useState(false);
  const [streamStats, setStreamStats] = useState({ fps: "—", res: "—" });
  const [filters, setFilters] = useState({ brightness: 100, contrast: 100, saturation: 100 });
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [screenSources, setScreenSources] = useState<{ id: string; name: string; thumbnail: string }[]>([]);
  const [showSourcePicker, setShowSourcePicker] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recStartRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
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

  // Keep captureModeRef in sync for use inside recorder.onstop closure
  useEffect(() => { captureModeRef.current = captureMode; }, [captureMode]);

  // Keep pipPositionRef in sync so RAF loop reads fresh position (BUG 1 fix)
  useEffect(() => { pipPositionRef.current = pipPosition; }, [pipPosition]);

  /* ── Step 2: Device enumeration ── */
  const enumerateDevicesNow = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === "videoinput");
      const audioInputs = devices.filter((d) => d.kind === "audioinput");
      setCameras(videoInputs);
      setMics(audioInputs);
    } catch (err) {
      console.error("enumerateDevices failed:", err);
    }
  }, []);

  useEffect(() => {
    enumerateDevicesNow();
    const handler = () => enumerateDevicesNow();
    navigator.mediaDevices.addEventListener("devicechange", handler);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", handler);
    };
  }, [enumerateDevicesNow]);

  /* ── Canvas composite loop (Step 4) ── */
  const startCompositeLoop = useCallback(() => {
    const canvas = canvasRef.current;
    const screenVid = screenVideoRef.current;
    const pipVid = pipVideoRef.current;
    if (!canvas || !screenVid) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      // Match canvas to screen video resolution
      if (screenVid.videoWidth && screenVid.videoHeight) {
        canvas.width = screenVid.videoWidth;
        canvas.height = screenVid.videoHeight;
      }

      // Draw screen (full frame)
      ctx.drawImage(screenVid, 0, 0, canvas.width, canvas.height);

      // Draw PiP camera overlay
      if (pipVid && pipVid.videoWidth > 0) {
        const pipW = canvas.width * 0.2;
        const pipH = pipW * (pipVid.videoHeight / pipVid.videoWidth);
        // pipPosition is normalized 0-1; map to canvas coords with margin
        const margin = 16;
        const maxX = canvas.width - pipW - margin;
        const maxY = canvas.height - pipH - margin;
        const pos = pipPositionRef.current;
        const px = margin + pos.x * maxX;
        const py = margin + pos.y * maxY;

        // Rounded rectangle clip
        const radius = 12;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(px + radius, py);
        ctx.lineTo(px + pipW - radius, py);
        ctx.quadraticCurveTo(px + pipW, py, px + pipW, py + radius);
        ctx.lineTo(px + pipW, py + pipH - radius);
        ctx.quadraticCurveTo(px + pipW, py + pipH, px + pipW - radius, py + pipH);
        ctx.lineTo(px + radius, py + pipH);
        ctx.quadraticCurveTo(px, py + pipH, px, py + pipH - radius);
        ctx.lineTo(px, py + radius);
        ctx.quadraticCurveTo(px, py, px + radius, py);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(pipVid, px, py, pipW, pipH);
        ctx.restore();

        // White border
        ctx.save();
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(px + radius, py);
        ctx.lineTo(px + pipW - radius, py);
        ctx.quadraticCurveTo(px + pipW, py, px + pipW, py + radius);
        ctx.lineTo(px + pipW, py + pipH - radius);
        ctx.quadraticCurveTo(px + pipW, py + pipH, px + pipW - radius, py + pipH);
        ctx.lineTo(px + radius, py + pipH);
        ctx.quadraticCurveTo(px, py + pipH, px, py + pipH - radius);
        ctx.lineTo(px, py + radius);
        ctx.quadraticCurveTo(px, py, px + radius, py);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
  }, []);

  const stopCompositeLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    if (compositeStreamRef.current) {
      compositeStreamRef.current.getTracks().forEach((t) => t.stop());
      compositeStreamRef.current = null;
    }
  }, []);

  /* ── Step 5: PiP camera management ── */
  const startPipCamera = useCallback(async () => {
    // Clean up any existing PiP resources before starting fresh
    stopCompositeLoop();
    if (pipStreamRef.current) {
      pipStreamRef.current.getTracks().forEach((t) => t.stop());
      pipStreamRef.current = null;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: selectedCamId
          ? { deviceId: { exact: selectedCamId }, width: { ideal: 640 }, height: { ideal: 480 } }
          : { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      pipStreamRef.current = stream;

      if (pipVideoRef.current) {
        pipVideoRef.current.srcObject = stream;
        pipVideoRef.current.play().catch((err) => console.warn("PiP video play failed:", err));
      }

      // Re-enumerate to get real labels after permission grant
      enumerateDevicesNow();

      // Monitor track ended (camera disconnect)
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        stopPipCamera();
        setPipEnabled(false);
      });

      // Start canvas composite
      startCompositeLoop();

      // Create composite stream from canvas
      const canvas = canvasRef.current;
      if (canvas && typeof canvas.captureStream === "function") {
        compositeStreamRef.current = canvas.captureStream(30);
      }
      setIsPipActive(true);
    } catch (err) {
      console.error("PiP camera failed:", err);
      setPipEnabled(false);
    }
  }, [selectedCamId, enumerateDevicesNow, startCompositeLoop, stopCompositeLoop, setPipEnabled]);

  const stopPipCamera = useCallback(() => {
    setIsPipActive(false);
    stopCompositeLoop();
    if (pipStreamRef.current) {
      pipStreamRef.current.getTracks().forEach((t) => t.stop());
      pipStreamRef.current = null;
    }
    if (pipVideoRef.current) pipVideoRef.current.srcObject = null;
  }, [stopCompositeLoop]);

  // Auto-manage PiP based on state (Step 5)
  useEffect(() => {
    if (pipEnabled && isStreaming && captureMode === "screen") {
      startPipCamera();
      return () => stopPipCamera(); // cleanup old PiP when deps change (e.g. camera device switch)
    } else {
      stopPipCamera();
    }
  }, [pipEnabled, isStreaming, captureMode, startPipCamera, stopPipCamera]);

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
      if (pipStreamRef.current) {
        pipStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (compositeStreamRef.current) {
        compositeStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
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

  /* ── Step 3: startStream with real deviceId ── */
  const startStream = useCallback(async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    try {
      const videoConstraints: MediaTrackConstraints = selectedCamId
        ? { deviceId: { exact: selectedCamId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
        : { facingMode: "user" as const, width: { ideal: 1920 }, height: { ideal: 1080 } };

      const audioConstraints: MediaTrackConstraints | boolean = selectedMicId
        ? { deviceId: { exact: selectedMicId } }
        : true;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: audioConstraints,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsStreaming(true);

      // Re-enumerate to get real labels
      enumerateDevicesNow();

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
  }, [selectedCamId, selectedMicId, enumerateDevicesNow]);

  const stopStream = useCallback(() => {
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
    // PiP cleanup
    stopPipCamera();
    if (videoRef.current) videoRef.current.srcObject = null;
    if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
    setIsStreaming(false);
    setStreamStats({ fps: "—", res: "—" });
  }, [stopPipCamera]);

  /* ── Step 3: startScreenStream with real deviceId ── */
  const startScreenStream = useCallback(async () => {
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
        const micConstraints: MediaTrackConstraints = selectedMicId
          ? { deviceId: { exact: selectedMicId } }
          : {};
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: micConstraints });
        micStreamRef.current = micStream;

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

        const micSrc = audioCtx.createMediaStreamSource(micStream);
        micSrc.connect(dest);

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

      // Feed screen video to both the visible preview and the hidden compositing video
      if (videoRef.current) {
        videoRef.current.srcObject = finalStream;
        videoRef.current.play();
      }
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = new MediaStream(displayStream.getVideoTracks());
        screenVideoRef.current.play().catch((err) => console.warn("Screen video play failed:", err));
      }

      setIsStreaming(true);

      // Re-enumerate to get real labels
      enumerateDevicesNow();

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
  }, [screenSysAudio, screenMicOn, selectedMicId, stopStream, enumerateDevicesNow]);

  /* ── Screen source picker (Electron only) ── */
  const isElectron = !!(window as unknown as { electronAPI?: { getScreenSources?: () => Promise<unknown> } }).electronAPI?.getScreenSources;

  const handleScreenStreamClick = useCallback(async () => {
    if (!isElectron) {
      // Browser: getDisplayMedia shows its own native picker
      startScreenStream();
      return;
    }
    // Electron: fetch sources and show picker
    try {
      const api = (window as unknown as { electronAPI: {
        getScreenSources: () => Promise<{ id: string; name: string; thumbnail: string }[]>;
        selectScreenSource: (id: string) => Promise<void>;
      } }).electronAPI;
      const sources = await api.getScreenSources();
      setScreenSources(sources);
      setShowSourcePicker(true);
    } catch (err) {
      console.error("Failed to get screen sources:", err);
    }
  }, [isElectron, startScreenStream]);

  const pickSource = useCallback(async (sourceId: string) => {
    setShowSourcePicker(false);
    setScreenSources([]);
    try {
      const api = (window as unknown as { electronAPI: {
        selectScreenSource: (id: string) => Promise<void>;
      } }).electronAPI;
      // Stop existing stream before switching source
      if (streamRef.current) {
        stopStream();
      }
      await api.selectScreenSource(sourceId);
      startScreenStream();
    } catch (err) {
      console.error("Failed to select screen source:", err);
    }
  }, [startScreenStream, stopStream]);

  /* ── Step 7: startRecording with composite support ── */
  const startRecording = useCallback(() => {
    // Choose stream: composite (PiP) or regular
    let recordStream = streamRef.current;
    if (captureMode === "screen" && pipEnabled && compositeStreamRef.current) {
      // Composite video from canvas + audio from the main stream
      const audioTracks = streamRef.current?.getAudioTracks() ?? [];
      recordStream = new MediaStream([
        ...compositeStreamRef.current.getVideoTracks(),
        ...audioTracks,
      ]);
    }
    if (!recordStream) return;

    const mimeType = MediaRecorder.isTypeSupported("video/mp4;codecs=avc1")
      ? "video/mp4"
      : MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";

    const recorder = new MediaRecorder(recordStream, { mimeType });
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
  }, [block.id, captureMode, pipEnabled]);

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

  /* ── Step 6: PiP drag handlers ── */
  const handlePipDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const stage = stageRef.current;
    if (!stage) return;

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const rect = stage.getBoundingClientRect();

    // PiP overlay is 20% of stage width
    const pipW = rect.width * 0.2;
    const pipH = pipW * 0.75; // approx 4:3
    const margin = 8;
    const maxX = rect.width - pipW - margin;
    const maxY = rect.height - pipH - margin;
    const currentPx = margin + pipPosition.x * maxX;
    const currentPy = margin + pipPosition.y * maxY;

    pipDragRef.current = {
      dragging: true,
      offsetX: clientX - rect.left - currentPx,
      offsetY: clientY - rect.top - currentPy,
    };

    const onMove = (ev: MouseEvent | TouchEvent) => {
      if (!pipDragRef.current.dragging) return;
      const cx = "touches" in ev ? ev.touches[0].clientX : ev.clientX;
      const cy = "touches" in ev ? ev.touches[0].clientY : ev.clientY;
      const stageRect = stage.getBoundingClientRect();
      const mW = stageRect.width * 0.2;
      const mH = mW * 0.75;
      const mg = 8;
      const mxX = stageRect.width - mW - mg;
      const mxY = stageRect.height - mH - mg;

      const rawX = cx - stageRect.left - pipDragRef.current.offsetX - mg;
      const rawY = cy - stageRect.top - pipDragRef.current.offsetY - mg;
      const nx = Math.max(0, Math.min(1, mxX > 0 ? rawX / mxX : 0));
      const ny = Math.max(0, Math.min(1, mxY > 0 ? rawY / mxY : 0));
      setPipPosition({ x: nx, y: ny });
    };

    const onUp = () => {
      pipDragRef.current.dragging = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchmove", onMove);
    document.addEventListener("touchend", onUp);
  }, [pipPosition, setPipPosition]);

  /* ── Helper: device label with fallback ── */
  const deviceLabel = (dev: MediaDeviceInfo, idx: number, kind: "cam" | "mic") => {
    const base = dev.label || (kind === "cam" ? `${pick("攝影機", "Camera")} ${idx + 1}` : `${pick("麥克風", "Mic")} ${idx + 1}`);
    return dev.deviceId === "default" ? `${base} ${pick("(預設)", "(Default)")}` : base;
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

  /* ── Compute PiP overlay position for the preview div ── */
  const pipOverlayStyle = (): React.CSSProperties => {
    const pipW = 20; // % of stage
    const pipH = 15; // approx 4:3
    const margin = 2; // %
    const maxX = 100 - pipW - margin;
    const maxY = 100 - pipH - margin;
    return {
      position: "absolute",
      width: `${pipW}%`,
      aspectRatio: "4/3",
      left: `${margin + pipPosition.x * maxX}%`,
      top: `${margin + pipPosition.y * maxY}%`,
      borderRadius: "8px",
      overflow: "hidden",
      border: "2px solid rgba(255,255,255,0.7)",
      cursor: "grab",
      zIndex: 10,
      boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
    };
  };

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
              {audioToggleBtn(screenMicOn, () => setScreenMicOn(!screenMicOn), pick("麥克風", "Microphone"))}
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
              {isElectron && isStreaming && !isRecording && (
                <button
                  onClick={async () => {
                    const api = (window as unknown as { electronAPI: {
                      getScreenSources: () => Promise<{ id: string; name: string; thumbnail: string }[]>;
                    } }).electronAPI;
                    const sources = await api.getScreenSources();
                    setScreenSources(sources);
                    setShowSourcePicker(true);
                  }}
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
              {isStreaming && (
                <span style={{ fontSize: "calc(10px * var(--text-scale))", color: "#999", marginLeft: "4px" }}>
                  {pick("停止串流以更改音訊", "Stop stream to change audio")}
                </span>
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

      {/* Video stage */}
      <div
        ref={stageRef}
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
            <PipPreviewVideo stream={pipStreamRef.current} />
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
            onClick={isStreaming ? stopStream : (captureMode === "screen" ? handleScreenStreamClick : startStream)}
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
            <span style={{ color: "#fff", fontSize: "calc(14px * var(--text-scale))", fontWeight: 600 }}>
              {pick("選擇螢幕來源", "Choose Screen Source")}
            </span>
            <button
              onClick={() => { setShowSourcePicker(false); setScreenSources([]); }}
              style={{ background: "none", border: "none", color: "#999", fontSize: "calc(18px * var(--text-scale))", cursor: "pointer" }}
            >
              ✕
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
            {screenSources.map((src) => (
              <button
                key={src.id}
                onClick={() => pickSource(src.id)}
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
                  fontSize: "calc(11px * var(--text-scale))",
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
