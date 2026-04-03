'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  /** True when running inside Electron */
  isElectron: true,

  /** Open a native folder picker. Returns the selected path string, or null if cancelled. */
  openDirectory: () => ipcRenderer.invoke('dialog:open-directory'),

  /** Read a file from a directory. Returns the file contents as a string, or null if not found. */
  readFile: (dirPath, filename) => ipcRenderer.invoke('fs:read-file', dirPath, filename),

  /** Write a file to a directory. Returns true on success. */
  writeFile: (dirPath, filename, content) => ipcRenderer.invoke('fs:write-file', dirPath, filename, content),

  /** Check whether a file exists in a directory. */
  fileExists: (dirPath, filename) => ipcRenderer.invoke('fs:file-exists', dirPath, filename),
});
