import { create } from "zustand";

interface StreamStore {
  /** The active MediaStream from VideoCaptureBlock (screen/camera/PiP composite) */
  activeStream: MediaStream | null;
  setActiveStream: (stream: MediaStream | null) => void;
}

export const useStreamStore = create<StreamStore>((set) => ({
  activeStream: null,
  setActiveStream: (stream) => set({ activeStream: stream }),
}));
