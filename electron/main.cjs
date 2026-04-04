'use strict';

const { app, BrowserWindow, ipcMain, dialog, session, desktopCapturer } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const https = require('https');

// ─── YouTube OAuth2 credentials (loaded from gitignored file) ────────────────
let YT_CLIENT_ID = '';
let YT_CLIENT_SECRET = '';
const YT_REDIRECT_URI = 'http://localhost';
const YT_SCOPE = 'https://www.googleapis.com/auth/youtube';

try {
  const credPath = path.join(__dirname, '..', 'youtube-credentials.json');
  if (fs.existsSync(credPath)) {
    const creds = JSON.parse(fs.readFileSync(credPath, 'utf-8'));
    YT_CLIENT_ID = creds.client_id || '';
    YT_CLIENT_SECRET = creds.client_secret || '';
  }
} catch (err) {
  console.warn('YouTube credentials not found:', err.message);
}

const isDev = !app.isPackaged;

// ─── Updater: push status to renderer ────────────────────────────────────────
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;

let mainWindow = null;

function sendUpdaterStatus(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater:status', payload);
  }
}

autoUpdater.on('checking-for-update', () => {
  sendUpdaterStatus({ status: 'checking' });
});

autoUpdater.on('update-available', (info) => {
  // Notify renderer so user can choose to download
  sendUpdaterStatus({ status: 'available', version: info.version });
});

autoUpdater.on('update-not-available', () => {
  sendUpdaterStatus({ status: 'up-to-date' });
});

autoUpdater.on('download-progress', (progress) => {
  sendUpdaterStatus({ status: 'downloading', percent: Math.round(progress.percent) });
});

autoUpdater.on('update-downloaded', (info) => {
  sendUpdaterStatus({ status: 'ready', version: info.version });
});

autoUpdater.on('error', () => {
  sendUpdaterStatus({ status: 'error' });
});

// ─── Window ───────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(['media', 'camera', 'microphone', 'display-capture'].includes(permission));
  });

  // Enable getDisplayMedia() in renderer — use pre-selected source from picker
  let selectedSourceId = null;

  session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
    desktopCapturer.getSources({ types: ['screen', 'window'] }).then((sources) => {
      let chosen = sources[0];
      if (selectedSourceId) {
        chosen = sources.find((s) => s.id === selectedSourceId) || chosen;
        selectedSourceId = null;
      }
      callback({ video: chosen, audio: 'loopback' });
    });
  });

  // IPC: Screen source picker support
  ipcMain.handle('screen:get-sources', async () => {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 320, height: 180 },
    });
    return sources.map((s) => ({
      id: s.id,
      name: s.name,
      thumbnail: s.thumbnail.toDataURL(),
    }));
  });

  ipcMain.handle('screen:select-source', (_event, id) => {
    selectedSourceId = id;
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    // Silent background check on launch — UI handles the result
    setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 5000);
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── IPC: Updater ─────────────────────────────────────────────────────────────
ipcMain.handle('updater:check', async () => {
  try {
    await autoUpdater.checkForUpdates();
  } catch {
    sendUpdaterStatus({ status: 'error' });
  }
});

ipcMain.handle('updater:download', () => {
  sendUpdaterStatus({ status: 'downloading', percent: 0 });
  autoUpdater.downloadUpdate();
});

ipcMain.handle('updater:install', () => {
  autoUpdater.quitAndInstall();
});

ipcMain.handle('updater:defer', () => {
  autoUpdater.autoInstallOnAppQuit = true;
});

ipcMain.handle('app:version', () => app.getVersion());

// ─── IPC: Folder picker ───────────────────────────────────────────────────────
ipcMain.handle('dialog:open-directory', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win || BrowserWindow.getFocusedWindow(), {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Choose sync folder',
    buttonLabel: 'Select folder',
  });
  return result.canceled ? null : result.filePaths[0];
});

// ─── IPC: File system ─────────────────────────────────────────────────────────
ipcMain.handle('fs:read-file', async (_event, dirPath, filename) => {
  try {
    const filePath = path.join(dirPath, filename);
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf-8');
  } catch { return null; }
});

ipcMain.handle('fs:write-file', async (_event, dirPath, filename, content) => {
  try {
    if (!fs.existsSync(dirPath)) return false;
    fs.writeFileSync(path.join(dirPath, filename), content, 'utf-8');
    return true;
  } catch { return false; }
});

ipcMain.handle('fs:file-exists', async (_event, dirPath, filename) => {
  try { return fs.existsSync(path.join(dirPath, filename)); }
  catch { return false; }
});

// ─── IPC: YouTube OAuth2 ─────────────────────────────────────────────────────

/** POST to Google token endpoint, returns parsed JSON */
function googleTokenRequest(body) {
  return new Promise((resolve, reject) => {
    const data = new URLSearchParams(body).toString();
    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch { reject(new Error('Failed to parse token response')); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

ipcMain.handle('youtube:auth-start', async () => {
  const authUrl = `https://accounts.google.com/o/oauth2/auth?` +
    `client_id=${encodeURIComponent(YT_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(YT_REDIRECT_URI)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(YT_SCOPE)}` +
    `&access_type=offline` +
    `&prompt=consent`;

  const authWin = new BrowserWindow({
    width: 520,
    height: 700,
    parent: mainWindow,
    modal: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  authWin.setMenuBarVisibility(false);
  authWin.loadURL(authUrl);

  // Intercept redirect to http://localhost?code=...
  authWin.webContents.on('will-redirect', async (_event, url) => {
    if (!url.startsWith(YT_REDIRECT_URI)) return;
    const code = new URL(url).searchParams.get('code');
    if (!code) { authWin.close(); return; }

    try {
      const tokens = await googleTokenRequest({
        code,
        client_id: YT_CLIENT_ID,
        client_secret: YT_CLIENT_SECRET,
        redirect_uri: YT_REDIRECT_URI,
        grant_type: 'authorization_code',
      });
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('youtube:tokens', {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: Date.now() + (tokens.expires_in || 3600) * 1000 - 60000,
        });
      }
    } catch (err) {
      console.error('YouTube token exchange failed:', err);
    }
    authWin.close();
  });

  // Also handle the case where Google puts code in the final URL (no redirect)
  authWin.webContents.on('will-navigate', async (_event, url) => {
    if (!url.startsWith(YT_REDIRECT_URI)) return;
    const code = new URL(url).searchParams.get('code');
    if (!code) { authWin.close(); return; }

    try {
      const tokens = await googleTokenRequest({
        code,
        client_id: YT_CLIENT_ID,
        client_secret: YT_CLIENT_SECRET,
        redirect_uri: YT_REDIRECT_URI,
        grant_type: 'authorization_code',
      });
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('youtube:tokens', {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: Date.now() + (tokens.expires_in || 3600) * 1000 - 60000,
        });
      }
    } catch (err) {
      console.error('YouTube token exchange failed:', err);
    }
    authWin.close();
  });
});

ipcMain.handle('youtube:refresh-token', async (_event, refreshToken) => {
  try {
    const result = await googleTokenRequest({
      refresh_token: refreshToken,
      client_id: YT_CLIENT_ID,
      client_secret: YT_CLIENT_SECRET,
      grant_type: 'refresh_token',
    });
    if (result.access_token) {
      return {
        access_token: result.access_token,
        expires_in: result.expires_in || 3600,
      };
    }
    return null;
  } catch (err) {
    console.error('YouTube token refresh failed:', err);
    return null;
  }
});

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
