'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,

  // ── Folder / file system ──────────────────────────────────────────────────
  openDirectory: () => ipcRenderer.invoke('dialog:open-directory'),
  readFile: (dirPath, filename) => ipcRenderer.invoke('fs:read-file', dirPath, filename),
  writeFile: (dirPath, filename, content) => ipcRenderer.invoke('fs:write-file', dirPath, filename, content),
  fileExists: (dirPath, filename) => ipcRenderer.invoke('fs:file-exists', dirPath, filename),

  // ── App info ──────────────────────────────────────────────────────────────
  getAppVersion: () => ipcRenderer.invoke('app:version'),

  // ── Updates ───────────────────────────────────────────────────────────────
  /** Ask the main process to check GitHub for a newer version. */
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),

  /** Quit and install the downloaded update. */
  installUpdate: () => ipcRenderer.invoke('updater:install'),

  /**
   * Subscribe to update status events from main.
   * Returns an unsubscribe function — call it in useEffect cleanup.
   *
   * Payload: { status: 'checking'|'up-to-date'|'downloading'|'ready'|'error', percent?: number, version?: string }
   */
  onUpdateStatus: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('updater:status', handler);
    return () => ipcRenderer.removeListener('updater:status', handler);
  },
});
