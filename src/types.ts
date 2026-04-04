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
  | "video-capture"
  | "youtube-studio";

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
  textScale?: number;
  pinned?: boolean;
  pinnedOrder?: number;
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

export type GitSyncStatus = "idle" | "syncing" | "synced" | "error" | "conflict" | "auth-error";

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

// ─── YouTube API types ───────────────────────────────────────────────────────
export interface YTTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}

export type YTStreamStatus =
  | { status: "starting" }
  | { status: "streaming" }
  | { status: "stopped" }
  | { status: "error"; error: string };

// ─── Electron IPC bridge ──────────────────────────────────────────────────────
export type UpdateStatus =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "up-to-date" }
  | { status: "available"; version: string }
  | { status: "downloading"; percent: number; version?: string }
  | { status: "ready"; version?: string }
  | { status: "error"; message?: string };

declare global {
  interface Window {
    electronAPI?: {
      isElectron: true;
      // File system
      openDirectory: () => Promise<string | null>;
      readFile: (dirPath: string, filename: string) => Promise<string | null>;
      writeFile: (dirPath: string, filename: string, content: string) => Promise<boolean>;
      fileExists: (dirPath: string, filename: string) => Promise<boolean>;
      // Screen capture
      getScreenSources: () => Promise<{ id: string; name: string; thumbnail: string }[]>;
      selectScreenSource: (id: string) => Promise<void>;
      // App
      getAppVersion: () => Promise<string>;
      // Updates
      checkForUpdates: () => Promise<void>;
      downloadUpdate: () => Promise<void>;
      installUpdate: () => void;
      deferUpdate: () => Promise<void>;
      onUpdateStatus: (cb: (data: UpdateStatus) => void) => () => void;
      // YouTube OAuth2
      youtubeAuthStart: () => Promise<void>;
      youtubeRefreshToken: (refreshToken: string) => Promise<{ access_token: string; expires_in: number } | null>;
      onYoutubeTokens: (cb: (tokens: YTTokens) => void) => () => void;
      // YouTube RTMP streaming
      youtubeStartStream: (rtmpUrl: string) => Promise<boolean>;
      youtubeStreamChunk: (chunk: ArrayBuffer) => Promise<void>;
      youtubeStopStream: () => Promise<void>;
      onYoutubeStreamStatus: (cb: (data: YTStreamStatus) => void) => () => void;
      // Git sync
      gitInit: (dirPath: string, remoteUrl: string) => Promise<{ ok: boolean; stderr: string }>;
      gitCommit: (dirPath: string) => Promise<{ ok: boolean; stderr: string; nothingToCommit: boolean }>;
      gitPush: (dirPath: string) => Promise<{ ok: boolean; stderr: string }>;
      gitPull: (dirPath: string) => Promise<{ ok: boolean; stderr: string; hadChanges: boolean }>;
      gitStatus: (dirPath: string) => Promise<{ ok: boolean; branch: string; remoteUrl: string; lastCommit: string }>;
      requestQuit: () => Promise<void>;
      onAboutToQuit: (cb: () => void) => () => void;
    };
  }
}
