import { useCallback } from "react";
import { useStreamStore } from "../../stores/useStreamStore";

interface UseScreenStreamParams {
  screenSysAudio: boolean;
  screenMicOn: boolean;
  selectedMicId: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  screenVideoRef: React.RefObject<HTMLVideoElement | null>;
  streamRef: React.MutableRefObject<MediaStream | null>;
  micStreamRef: React.MutableRefObject<MediaStream | null>;
  audioCtxRef: React.MutableRefObject<AudioContext | null>;
  micGainRef: React.MutableRefObject<GainNode | null>;
  setIsStreaming: (v: boolean) => void;
  setStreamStats: (v: { fps: string; res: string }) => void;
  stopStream: () => void;
  enumerateDevicesNow: () => Promise<void>;
}

export function useScreenStream({
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
}: UseScreenStreamParams) {
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
    micGainRef.current = null;

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

        const micGain = audioCtx.createGain();
        micGainRef.current = micGain;
        const micSrc = audioCtx.createMediaStreamSource(micStream);
        micSrc.connect(micGain);
        micGain.connect(dest);

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
      useStreamStore.getState().setActiveStream(finalStream);

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
  }, [screenSysAudio, screenMicOn, selectedMicId, stopStream, enumerateDevicesNow,
      streamRef, micStreamRef, audioCtxRef, micGainRef, videoRef, screenVideoRef,
      setIsStreaming, setStreamStats]);

  return { startScreenStream };
}
