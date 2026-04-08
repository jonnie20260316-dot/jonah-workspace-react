'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,

  // ── Folder / file system ──────────────────────────────────────────────────
  openDirectory: () => ipcRenderer.invoke('dialog:open-directory'),
  readFile: (dirPath, filename) => ipcRenderer.invoke('fs:read-file', dirPath, filename),
  writeFile: (dirPath, filename, content) => ipcRenderer.invoke('fs:write-file', dirPath, filename, content),
  fileExists: (dirPath, filename) => ipcRenderer.invoke('fs:file-exists', dirPath, filename),
  listDir: (dirPath) => ipcRenderer.invoke('fs:list-dir', dirPath),

  // ── Screen capture source picker ───────────────────────────────────────────
  getScreenSources: () => ipcRenderer.invoke('screen:get-sources'),
  selectScreenSource: (id) => ipcRenderer.invoke('screen:select-source', id),

  // ── App info ──────────────────────────────────────────────────────────────
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  getScreenPermissionStatus: () => ipcRenderer.invoke('app:screen-permission-status'),
  openScreenRecordingSettings: () => ipcRenderer.invoke('app:open-screen-recording-settings'),

  // ── Updates ───────────────────────────────────────────────────────────────
  /** Ask the main process to check GitHub for a newer version. */
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),

  /** Start downloading the update (call after user sees 'available' state). */
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),

  /** Quit and install the downloaded update immediately. */
  installUpdate: () => ipcRenderer.invoke('updater:install'),

  /**
   * Defer install to next quit (sets autoInstallOnAppQuit = true in main).
   * The UI can then dismiss the ready state without forcing a restart.
   */
  deferUpdate: () => ipcRenderer.invoke('updater:defer'),

  /**
   * Subscribe to update status events from main.
   * Returns an unsubscribe function — call it in useEffect cleanup.
   *
   * Payload: UpdateStatus (see src/types.ts)
   */
  onUpdateStatus: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('updater:status', handler);
    return () => ipcRenderer.removeListener('updater:status', handler);
  },

  // ── YouTube OAuth2 ──────────────────────────────────────────────────────
  youtubeAuthStart: () => ipcRenderer.invoke('youtube:auth-start'),
  youtubeRefreshToken: (refreshToken) => ipcRenderer.invoke('youtube:refresh-token', refreshToken),
  onYoutubeTokens: (callback) => {
    const handler = (_event, tokens) => callback(tokens);
    ipcRenderer.on('youtube:tokens', handler);
    return () => ipcRenderer.removeListener('youtube:tokens', handler);
  },

  // ── YouTube RTMP streaming ─────────────────────────────────────────────
  youtubeStartStream: (rtmpUrl) => ipcRenderer.invoke('youtube:start-stream', rtmpUrl),
  youtubeStreamChunk: (chunk) => ipcRenderer.invoke('youtube:stream-chunk', chunk),
  youtubeStopStream: () => ipcRenderer.invoke('youtube:stop-stream'),
  onYoutubeStreamStatus: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('youtube:stream-status', handler);
    return () => ipcRenderer.removeListener('youtube:stream-status', handler);
  },

  // ── Storage backup ──────────────────────────────────────────────────────
  backupStorage: (jsonStr) => ipcRenderer.invoke('storage:backup', jsonStr),
  restoreStorage: () => ipcRenderer.invoke('storage:restore'),

  // ── GitHub REST API sync ────────────────────────────────────────────────
  githubGetFile: (token, owner, repo, filepath) => ipcRenderer.invoke('github:get-file', token, owner, repo, filepath),
  githubPutFile: (token, owner, repo, filepath, content, sha) => ipcRenderer.invoke('github:put-file', token, owner, repo, filepath, content, sha),

  openDevTools: () => ipcRenderer.invoke('app:open-devtools'),
  spotifyOpenPlayer: (url) => ipcRenderer.invoke('spotify:open-player', url),
  spotifyOpenLogin: () => ipcRenderer.invoke('spotify:open-login'),
  onSpotifyLoginDone: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('spotify:login-done', handler);
    return () => ipcRenderer.removeListener('spotify:login-done', handler);
  },
  requestQuit: () => ipcRenderer.invoke('app:request-quit'),
  onAboutToQuit: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('app:about-to-quit', handler);
    return () => ipcRenderer.removeListener('app:about-to-quit', handler);
  },
});
