import { useState, useCallback } from "react";
import { loadJSON, saveJSON } from "../../utils/storage";

export interface SavedVideo {
  id: string;
  filename: string;
  duration: string;
  format: string;
  date: string;
  blobUrl?: string;
  source?: "camera" | "screen";
}

interface UseRecordingParams {
  blockId: string;
  captureMode: "camera" | "screen";
  pipEnabled: boolean;
  streamRef: React.MutableRefObject<MediaStream | null>;
  compositeStreamRef: React.MutableRefObject<MediaStream | null>;
  recorderRef: React.MutableRefObject<MediaRecorder | null>;
  chunksRef: React.MutableRefObject<Blob[]>;
  recTimerRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>;
  recStartRef: React.MutableRefObject<number>;
  captureModeRef: React.MutableRefObject<"camera" | "screen">;
}

export function useRecording({
  blockId,
  captureMode,
  pipEnabled,
  streamRef,
  compositeStreamRef,
  recorderRef,
  chunksRef,
  recTimerRef,
  recStartRef,
  captureModeRef,
}: UseRecordingParams) {
  const [isRecording, setIsRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [savedVideos, setSavedVideos] = useState<SavedVideo[]>(() =>
    loadJSON(`vc-saved-videos:${blockId}`, [])
  );

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
  }, [recorderRef, recTimerRef]);

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
        saveJSON(`vc-saved-videos:${blockId}`, updated.map(({ ...rest }) => rest));
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
  }, [blockId, captureMode, pipEnabled, streamRef, compositeStreamRef, recorderRef, chunksRef, recTimerRef, recStartRef, captureModeRef]);

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
    saveJSON(`vc-saved-videos:${blockId}`, updated.map(({ ...rest }) => rest));
  };

  return { isRecording, setIsRecording, recSeconds, savedVideos, startRecording, stopRecording, deleteVideo, formatRecTime };
}
