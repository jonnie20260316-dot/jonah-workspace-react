import { useState, useCallback, useEffect } from "react";
import { useStreamStore } from "../../stores/useStreamStore";
import type { Block } from "../../types";

interface UseCameraStreamParams {
  block: Block;
  selectedCamId: string;
  selectedMicId: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  screenVideoRef: React.RefObject<HTMLVideoElement | null>;
  streamRef: React.MutableRefObject<MediaStream | null>;
  micStreamRef: React.MutableRefObject<MediaStream | null>;
  audioCtxRef: React.MutableRefObject<AudioContext | null>;
  recorderRef: React.MutableRefObject<MediaRecorder | null>;
  recTimerRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>;
  enumerateDevicesNow: () => Promise<void>;
  stopPipCameraRef: React.MutableRefObject<() => void>;
  onRecordingStop?: () => void;
}

export function useCameraStream({
  block,
  selectedCamId,
  selectedMicId,
  videoRef,
  screenVideoRef,
  streamRef,
  micStreamRef,
  audioCtxRef,
  recorderRef,
  recTimerRef,
  enumerateDevicesNow,
  stopPipCameraRef,
  onRecordingStop,
}: UseCameraStreamParams) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamStats, setStreamStats] = useState({ fps: "—", res: "—" });

  const stopStream = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
      recorderRef.current = null;
      onRecordingStop?.();
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
    stopPipCameraRef.current();
    if (videoRef.current) videoRef.current.srcObject = null;
    if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
    setIsStreaming(false);
    useStreamStore.getState().setActiveStream(null);
    setStreamStats({ fps: "—", res: "—" });
  }, [stopPipCameraRef, streamRef, micStreamRef, audioCtxRef, recorderRef, recTimerRef, videoRef, screenVideoRef, onRecordingStop]);

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
      useStreamStore.getState().setActiveStream(stream);

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
  }, [selectedCamId, selectedMicId, enumerateDevicesNow, streamRef, videoRef]);

  // Stop stream when block is collapsed or pinned
  useEffect(() => {
    if ((block.collapsed || block.pinned) && streamRef.current) {
      stopStream();
    }
  }, [block.collapsed, block.pinned, stopStream, streamRef]);

  return { isStreaming, setIsStreaming, streamStats, setStreamStats, startStream, stopStream };
}
