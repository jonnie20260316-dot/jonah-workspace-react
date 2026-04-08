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
      listDir: (dirPath: string) => Promise<{ name: string; size: number; mtime: number }[]>;
      // Screen capture
      getScreenSources: () => Promise<{ id: string; name: string; thumbnail: string }[]>;
      selectScreenSource: (id: string) => Promise<void>;
      // App
      getAppVersion: () => Promise<string>;
      getScreenPermissionStatus: () => Promise<"granted" | "denied" | "restricted" | "not-determined">;
      openScreenRecordingSettings: () => Promise<boolean>;
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
      // GitHub REST API sync
      githubGetFile: (token: string, owner: string, repo: string, filepath: string) => Promise<{ ok: boolean; exists?: boolean; content?: string | null; sha?: string | null; error?: string }>;
      githubPutFile: (token: string, owner: string, repo: string, filepath: string, content: string, sha?: string) => Promise<{ ok: boolean; error?: string }>;
      requestQuit: () => Promise<void>;
      onAboutToQuit: (cb: () => void) => () => void;
      // Storage backup
      backupStorage: (jsonStr: string) => Promise<{ ok: boolean; error?: string }>;
      restoreStorage: () => Promise<{ ok: boolean; data?: string; error?: string }>;
    };
  }
}
