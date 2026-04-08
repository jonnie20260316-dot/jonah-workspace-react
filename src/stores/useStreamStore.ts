import { create } from "zustand";

interface StreamStore {
  /** The active MediaStream from VideoCaptureBlock (screen/camera/PiP composite) */
  activeStream: MediaStream | null;
  setActiveStream: (stream: MediaStream | null) => void;
  // Streaming state (for FloatingStreamControls)
  isStreaming: boolean;
  setIsStreaming: (v: boolean) => void;
  captureMode: "camera" | "screen" | null;
  setCaptureMode: (v: "camera" | "screen" | null) => void;
  // Mic mute
  micMuted: boolean;
  setMicMuted: (v: boolean) => void;
  toggleMicMute: (() => void) | null;
  setToggleMicMute: (fn: (() => void) | null) => void;
  // Source switch
  openSourcePicker: (() => void) | null;
  setOpenSourcePicker: (fn: (() => void) | null) => void;
}

export const useStreamStore = create<StreamStore>((set) => ({
  activeStream: null,
  setActiveStream: (stream) => set({ activeStream: stream }),
  isStreaming: false,
  setIsStreaming: (v) => set({ isStreaming: v }),
  captureMode: null,
  setCaptureMode: (v) => set({ captureMode: v }),
  micMuted: false,
  setMicMuted: (v) => set({ micMuted: v }),
  toggleMicMute: null,
  setToggleMicMute: (fn) => set({ toggleMicMute: fn }),
  openSourcePicker: null,
  setOpenSourcePicker: (fn) => set({ openSourcePicker: fn }),
}));
