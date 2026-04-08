import { create } from "zustand";

interface StreamStore {
  /** The active MediaStream from VideoCaptureBlock (screen/camera/PiP composite) */
  activeStream: MediaStream | null;
  setActiveStream: (stream: MediaStream | null) => void;
  stopActiveStream: () => void;
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
  // Source picker modal state (for FloatingStreamControls viewport-level picker)
  showSourcePicker: boolean;
  setShowSourcePicker: (v: boolean) => void;
  screenSources: { id: string; name: string; thumbnail: string }[];
  setScreenSources: (v: { id: string; name: string; thumbnail: string }[]) => void;
  cameras: MediaDeviceInfo[];
  setCameras: (v: MediaDeviceInfo[]) => void;
  pickSource: ((sourceId: string, mode: "screen" | "camera") => void) | null;
  setPickSource: (fn: ((sourceId: string, mode: "screen" | "camera") => void) | null) => void;
  closeSourcePicker: (() => void) | null;
  setCloseSourcePicker: (fn: (() => void) | null) => void;
}

export const useStreamStore = create<StreamStore>((set) => ({
  activeStream: null,
  setActiveStream: (stream) => set({ activeStream: stream }),
  stopActiveStream: () => {
    const stream = useStreamStore.getState().activeStream;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    set({ activeStream: null });
  },
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
  showSourcePicker: false,
  setShowSourcePicker: (v) => set({ showSourcePicker: v }),
  screenSources: [],
  setScreenSources: (v) => set({ screenSources: v }),
  cameras: [],
  setCameras: (v) => set({ cameras: v }),
  pickSource: null,
  setPickSource: (fn) => set({ pickSource: fn }),
  closeSourcePicker: null,
  setCloseSourcePicker: (fn) => set({ closeSourcePicker: fn }),
}));
