import { useState, useCallback, useEffect, useRef } from "react";

interface UsePipCameraParams {
  selectedCamId: string;
  pipEnabled: boolean;
  isStreaming: boolean;
  captureMode: "camera" | "screen";
  pipVideoRef: React.RefObject<HTMLVideoElement | null>;
  pipStreamRef: React.MutableRefObject<MediaStream | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  compositeStreamRef: React.MutableRefObject<MediaStream | null>;
  enumerateDevicesNow: () => Promise<void>;
  startCompositeLoop: () => void;
  stopCompositeLoop: () => void;
}

export function usePipCamera({
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
}: UsePipCameraParams) {
  const [isPipActive, setIsPipActive] = useState(false);

  const stopPipCamera = useCallback(() => {
    setIsPipActive(false);
    stopCompositeLoop();
    if (pipStreamRef.current) {
      pipStreamRef.current.getTracks().forEach((t) => t.stop());
      pipStreamRef.current = null;
    }
    if (pipVideoRef.current) pipVideoRef.current.srcObject = null;
  }, [stopCompositeLoop, pipStreamRef, pipVideoRef]);

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
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        // Stale/invalid deviceId — fall back to any available camera
        if (selectedCamId) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false,
          });
        } else {
          throw new Error("No camera available");
        }
      }
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
      setIsPipActive(false);
    }
  }, [selectedCamId, enumerateDevicesNow, startCompositeLoop, stopCompositeLoop, pipStreamRef, pipVideoRef, canvasRef, compositeStreamRef, stopPipCamera]);

  // Use refs to stabilize effect deps so function identity changes don't retrigger
  const startPipCameraRef = useRef(startPipCamera);
  const stopPipCameraRef = useRef(stopPipCamera);
  useEffect(() => { startPipCameraRef.current = startPipCamera; });
  useEffect(() => { stopPipCameraRef.current = stopPipCamera; });

  // Auto-manage PiP based on state (with stable refs to avoid race conditions)
  useEffect(() => {
    if (pipEnabled && isStreaming && captureMode === "screen") {
      startPipCameraRef.current();
      return () => stopPipCameraRef.current();
    } else {
      stopPipCameraRef.current();
    }
  }, [pipEnabled, isStreaming, captureMode]);

  return { isPipActive, startPipCamera, stopPipCamera };
}
