import { useState, useCallback, useEffect } from "react";

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

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
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
    }
  }, [selectedCamId, enumerateDevicesNow, startCompositeLoop, stopCompositeLoop, pipStreamRef, pipVideoRef, canvasRef, compositeStreamRef]);

  // Auto-manage PiP based on state
  useEffect(() => {
    if (pipEnabled && isStreaming && captureMode === "screen") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      startPipCamera();
      return () => stopPipCamera(); // cleanup old PiP when deps change (e.g. camera device switch)
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      stopPipCamera();
    }
  }, [pipEnabled, isStreaming, captureMode, startPipCamera, stopPipCamera]);

  return { isPipActive, startPipCamera, stopPipCamera };
}
