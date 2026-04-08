import { useState, useCallback } from "react";
import { useStreamStore } from "../../stores/useStreamStore";

interface UseSourceSwitcherParams {
  isStreaming: boolean;
  selectedCamId: string;
  setCaptureMode: (v: "camera" | "screen") => void;
  setStreamStats: (v: { fps: string; res: string }) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  screenVideoRef: React.RefObject<HTMLVideoElement | null>;
  streamRef: React.MutableRefObject<MediaStream | null>;
  stopStream: () => void;
  startStream: () => Promise<void>;
  startScreenStream: () => Promise<void>;
}

export function useSourceSwitcher({
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
}: UseSourceSwitcherParams) {
  const [screenSources, setScreenSources] = useState<{ id: string; name: string; thumbnail: string }[]>([]);
  const [showSourcePicker, setShowSourcePicker] = useState(false);

  const isElectron = !!(window as unknown as { electronAPI?: { getScreenSources?: () => Promise<unknown> } }).electronAPI?.getScreenSources;

  const getElectronAPI = () => (window as unknown as { electronAPI: {
    getScreenSources: () => Promise<{ id: string; name: string; thumbnail: string }[]>;
    selectScreenSource: (id: string) => Promise<void>;
  } }).electronAPI;

  const openSourcePicker = useCallback(async () => {
    if (isElectron) {
      try {
        const sources = await getElectronAPI().getScreenSources();
        setScreenSources(sources);
        setShowSourcePicker(true);
        // Sync to global store for FloatingStreamControls viewport-level picker
        useStreamStore.getState().setScreenSources(sources);
        useStreamStore.getState().setShowSourcePicker(true);
      } catch (err) {
        console.error("Failed to get screen sources:", err);
      }
    } else {
      // Browser: show source picker modal with cameras only
      useStreamStore.getState().setShowSourcePicker(true);
    }
  }, [isElectron]);

  const handleScreenStreamClick = useCallback(async () => {
    if (!isElectron) {
      startScreenStream();
      return;
    }
    openSourcePicker();
  }, [isElectron, startScreenStream, openSourcePicker]);

  /* ── OBS-style seamless source switch (no recording interruption) ── */
  const switchSource = useCallback(async (opts: {
    sourceId?: string;
    mode: "camera" | "screen";
  }) => {
    try {
      let newVideoTrack: MediaStreamTrack;

      if (opts.mode === "screen") {
        if (opts.sourceId && isElectron) {
          await getElectronAPI().selectScreenSource(opts.sourceId);
        }
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false, // keep existing audio — don't remix mid-recording
        });
        newVideoTrack = displayStream.getVideoTracks()[0];
        if (!newVideoTrack) return;

        // Update hidden compositing video (for PiP canvas path)
        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = new MediaStream([newVideoTrack]);
          screenVideoRef.current.play().catch((err) => console.warn("Screen video play failed:", err));
        }

        // Re-attach ended listener
        newVideoTrack.addEventListener("ended", () => stopStream());

      } else {
        // Camera mode
        const constraints: MediaTrackConstraints = selectedCamId
          ? { deviceId: { exact: selectedCamId } }
          : { facingMode: "user" as const };
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: constraints,
          audio: false,
        });
        newVideoTrack = camStream.getVideoTracks()[0];
        if (!newVideoTrack) return;

        // Clear the screen compositing video — no longer needed in camera mode
        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = null;
        }
      }

      // Replace video track on live stream (MediaRecorder stays attached)
      if (streamRef.current) {
        streamRef.current.getVideoTracks().forEach((t) => {
          streamRef.current!.removeTrack(t);
          t.stop();
        });
        streamRef.current.addTrack(newVideoTrack);
        useStreamStore.getState().setActiveStream(streamRef.current);
      }

      // Update visible preview — null first to force video element reload
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch((err) => console.warn("Preview play failed:", err));
      }

      // Update mode and stats
      setCaptureMode(opts.mode);
      const settings = newVideoTrack.getSettings();
      setStreamStats({
        fps: String(settings.frameRate || "—"),
        res: settings.width && settings.height
          ? `${settings.width}×${settings.height}`
          : "—",
      });
    } catch (err) {
      console.error("Source switch failed:", err);
    }
  }, [selectedCamId, stopStream, setCaptureMode, isElectron, screenVideoRef, streamRef, videoRef, setStreamStats]);

  const pickSource = useCallback(async (sourceId: string, mode: "screen" | "camera" = "screen") => {
    setShowSourcePicker(false);
    setScreenSources([]);

    if (isStreaming) {
      // Seamless — don't stop recording
      await switchSource({ sourceId, mode });
    } else {
      // First time — full start
      if (isElectron && mode === "screen") {
        await getElectronAPI().selectScreenSource(sourceId);
      }
      if (mode === "screen") {
        startScreenStream();
      } else {
        startStream();
      }
    }
  }, [isStreaming, switchSource, startScreenStream, startStream, isElectron]);

  return {
    screenSources,
    showSourcePicker,
    setShowSourcePicker,
    setScreenSources,
    isElectron,
    openSourcePicker,
    handleScreenStreamClick,
    switchSource,
    pickSource,
  };
}
