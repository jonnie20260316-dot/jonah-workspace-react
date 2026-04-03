'use strict';

const { app, BrowserWindow, ipcMain, dialog, session, nativeTheme } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

// In packaged app, __dirname points to the electron/ folder inside resources.
// In dev, __dirname is the project root's electron/ folder.
const isDev = !app.isPackaged;

// ─── Auto-updater config ────────────────────────────────────────────────────
autoUpdater.autoDownload = false; // Ask user before downloading

autoUpdater.on('update-available', (info) => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update available',
    message: `Version ${info.version} is available. Download now?`,
    buttons: ['Download', 'Later'],
    defaultId: 0,
  }).then(({ response }) => {
    if (response === 0) autoUpdater.downloadUpdate();
  });
});

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update ready',
    message: 'Update downloaded. Restart to apply?',
    buttons: ['Restart now', 'Later'],
    defaultId: 0,
  }).then(({ response }) => {
    if (response === 0) autoUpdater.quitAndInstall();
  });
});

autoUpdater.on('error', (err) => {
  // Silently log in dev; don't alert users in prod for minor update errors
  if (isDev) console.error('[updater]', err);
});

// ─── Window ─────────────────────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset', // macOS native look
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // needed for preload to require electron modules
    },
  });

  // Camera / microphone permissions
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowed = ['media', 'camera', 'microphone', 'display-capture'];
    callback(allowed.includes(permission));
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
    // Check for updates a few seconds after launch
    setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 5000);
  }

  return win;
}

// ─── IPC: Folder picker ──────────────────────────────────────────────────────
ipcMain.handle('dialog:open-directory', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win || BrowserWindow.getFocusedWindow(), {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Choose sync folder',
    buttonLabel: 'Select folder',
  });
  return result.canceled ? null : result.filePaths[0];
});

// ─── IPC: File system operations ─────────────────────────────────────────────
ipcMain.handle('fs:read-file', async (_event, dirPath, filename) => {
  try {
    const filePath = path.join(dirPath, filename);
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
});

ipcMain.handle('fs:write-file', async (_event, dirPath, filename, content) => {
  try {
    if (!fs.existsSync(dirPath)) return false;
    fs.writeFileSync(path.join(dirPath, filename), content, 'utf-8');
    return true;
  } catch (err) {
    console.error('[fs:write-file]', err);
    return false;
  }
});

ipcMain.handle('fs:file-exists', async (_event, dirPath, filename) => {
  try {
    return fs.existsSync(path.join(dirPath, filename));
  } catch {
    return false;
  }
});

// ─── App lifecycle ───────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // macOS: re-create window if dock icon is clicked and no windows open
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
