import { useState, useCallback, useEffect, useRef } from "react";
import { getStreamKey } from "../../utils/youtubeApi";
import { useStreamStore } from "../../stores/useStreamStore";
import { pick } from "../../utils/i18n";
import type { YTStreamStatus } from "../../types";
import type { YTBroadcast } from "../../utils/youtubeApi";

interface UseRtmpStreamParams {
  bitrateRef: React.MutableRefObject<number>;
  setError: (msg: string | null) => void;
}

export function useRtmpStream({ bitrateRef, setError }: UseRtmpStreamParams) {
  const [rtmpStatus, setRtmpStatus] = useState<YTStreamStatus["status"]>("stopped");
  const [rtmpStarting, setRtmpStarting] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);

  const hasRtmp = !!window.electronAPI?.youtubeStartStream;

  // Cleanup RTMP on unmount (JW-28)
  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      recorderRef.current = null;
      window.electronAPI?.youtubeStopStream?.();
    };
  }, []);

  // Listen for RTMP stream status from FFmpeg
  useEffect(() => {
    if (!window.electronAPI?.onYoutubeStreamStatus) return;
    const unsub = window.electronAPI.onYoutubeStreamStatus((data: YTStreamStatus) => {
      setRtmpStatus(data.status);
      if (data.status === "error" && "error" in data) {
        setError(data.error);
      }
      if (data.status === "stopped" || data.status === "error") {
        if (recorderRef.current && recorderRef.current.state !== "inactive") {
          recorderRef.current.stop();
        }
        recorderRef.current = null;
        setRtmpStarting(false);
      }
    });
    return unsub;
  }, [setError]);

  const stopRtmpStream = useCallback(async () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    if (window.electronAPI?.youtubeStopStream) {
      await window.electronAPI.youtubeStopStream();
    }
  }, []);

  const startRtmpStream = useCallback(async (broadcast: YTBroadcast) => {
    if (!hasRtmp || !broadcast.boundStreamId) return;
    const stream = useStreamStore.getState().activeStream;
    if (!stream) {
      setError(pick("請先在錄影區塊開始擷取", "Start a capture source in Video Capture first"));
      return;
    }

    setRtmpStarting(true);
    setError(null);

    try {
      const keyInfo = await getStreamKey(broadcast.boundStreamId);
      if (!keyInfo) {
        setError(pick("無法取得串流金鑰", "Failed to get stream key"));
        setRtmpStarting(false);
        return;
      }

      const rtmpUrl = `${keyInfo.rtmpUrl}/${keyInfo.streamKey}`;
      const ok = await window.electronAPI!.youtubeStartStream(rtmpUrl);
      if (!ok) {
        setRtmpStarting(false);
        return;
      }

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : "video/webm";

      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrateRef.current });
      recorderRef.current = recorder;

      recorder.ondataavailable = async (e) => {
        if (e.data.size > 0 && window.electronAPI?.youtubeStreamChunk) {
          const buf = await e.data.arrayBuffer();
          window.electronAPI.youtubeStreamChunk(buf);
        }
      };

      recorder.onerror = () => {
        setError(pick("錄製器錯誤", "Recorder error"));
        stopRtmpStream();
      };

      recorder.start(1000);
      setRtmpStarting(false);
    } catch (err) {
      console.error("RTMP stream start failed:", err);
      setError(pick("串流啟動失敗", "Stream start failed"));
      setRtmpStarting(false);
    }
  }, [hasRtmp, bitrateRef, setError, stopRtmpStream]);

  return { rtmpStatus, rtmpStarting, hasRtmp, startRtmpStream, stopRtmpStream };
}
