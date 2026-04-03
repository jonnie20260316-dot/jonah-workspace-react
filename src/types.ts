export type Lang = "zh" | "en";

export type BlockType =
  | "journal"
  | "kit"
  | "tasks"
  | "projects"
  | "intention"
  | "intel"
  | "timer"
  | "content"
  | "sticky"
  | "swipe"
  | "threads"
  | "video"
  | "metrics"
  | "spotify"
  | "dashboard"
  | "threads-intel"
  | "prompted-notes"
  | "video-capture";

export interface Block {
  id: string;
  type: BlockType;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  collapsed: boolean;
  archived: boolean;
  color: string;
}

export interface ViewportState {
  x: number;
  y: number;
  scale: number;
}

export interface BoardSize {
  w: number;
  h: number;
}

export interface TimerState {
  duration: number;
  remaining: number;
  running: boolean;
  overtime: number;
  wallStartedAt: number | null;
  mode: "work" | "break";
}

export interface TimerSettings {
  dailyTarget: number;
  autoOvertime: boolean;
  showNotification: boolean;
  selectedSound: string;
}

export interface TimerSession {
  id: string;
  task: string;
  duration: number;    // planned duration in seconds
  actual: number;      // elapsed seconds (duration - remaining)
  overtime: number;    // overtime seconds
  mode: "work" | "break";
  startedAt: string;   // ISO timestamp
  endedAt: string;     // ISO timestamp
}

export interface SyncMeta {
  lastPushedAt: string | null;
  pushCount: number;
  lastPulledAt: string | null;
  lastPulledRemotePushedAt: string | null;
}

export interface SyncCategory {
  id: string;
  zhLabel: string;
  enLabel: string;
  globalKeys: string[];
  globalKeyPrefixes: string[];
}

export interface SyncPayload {
  syncFormatVersion: number;
  pushedAt: string;
  deviceId: string;
  pushCount: number;
  blockCount: number;
  data: Record<string, string>;
}

export type SyncStatus = "idle" | "syncing" | "synced" | "conflict" | "error" | "offline";

export interface ConflictInfo {
  remote: SyncPayload;
  detectedAt: string;
}

export interface SyncQueueItem {
  id: string;
  op: "push" | "pull";
  queuedAt: string;
  retryCount: number;
}

// ─── Electron IPC bridge ──────────────────────────────────────────────────────
export type UpdateStatus =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "up-to-date" }
  | { status: "downloading"; percent: number; version?: string }
  | { status: "ready"; version?: string }
  | { status: "error" };

declare global {
  interface Window {
    electronAPI?: {
      isElectron: true;
      // File system
      openDirectory: () => Promise<string | null>;
      readFile: (dirPath: string, filename: string) => Promise<string | null>;
      writeFile: (dirPath: string, filename: string, content: string) => Promise<boolean>;
      fileExists: (dirPath: string, filename: string) => Promise<boolean>;
      // App
      getAppVersion: () => Promise<string>;
      // Updates
      checkForUpdates: () => Promise<void>;
      installUpdate: () => void;
      onUpdateStatus: (cb: (data: UpdateStatus) => void) => () => void;
    };
  }
}
