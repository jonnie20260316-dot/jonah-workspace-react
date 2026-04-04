'use strict';

const { app, BrowserWindow, ipcMain, dialog, session, desktopCapturer } = require('electron');
const { autoUpdater } = require('electron-updater');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

// ─── FFmpeg binary path (from ffmpeg-static) ─────────────────────────────────
let ffmpegPath;
try {
  ffmpegPath = require('ffmpeg-static');
  // In packaged app, ffmpeg-static path may need adjustment
  if (ffmpegPath && !fs.existsSync(ffmpegPath)) {
    // Try resolving relative to app resources
    const altPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked');
    if (fs.existsSync(altPath)) ffmpegPath = altPath;
  }
} catch {
  console.warn('ffmpeg-static not found — RTMP streaming disabled');
}

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
autoUpdater.forceDevUpdateConfig = true; // allow updater to run in unpackaged/dev context

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

let downloadedFilePath = null;

autoUpdater.on('update-downloaded', (info) => {
  downloadedFilePath = info.downloadedFile || null;
  sendUpdaterStatus({ status: 'ready', version: info.version });
});

autoUpdater.on('error', (err) => {
  console.error('[updater] error:', err?.message || err);
  sendUpdaterStatus({ status: 'error', message: err?.message || String(err) });
});

// ─── Local HTTP server (production) — keeps origin at localhost:5173 ─────────
let localServer = null;

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.webp': 'image/webp',
  '.ttf':  'font/ttf',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
};

function startLocalServer(distPath, port) {
  return new Promise((resolve, reject) => {
    localServer = http.createServer((req, res) => {
      let urlPath = req.url.split('?')[0];
      if (urlPath === '/') urlPath = '/index.html';
      const filePath = path.join(distPath, urlPath);
      const ext = path.extname(filePath).toLowerCase();

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
      } else {
        // SPA fallback
        const index = path.join(distPath, 'index.html');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        fs.createReadStream(index).pipe(res);
      }
    });

    localServer.on('error', reject);
    localServer.listen(port, '127.0.0.1', () => resolve());
  });
}

// ─── Window ───────────────────────────────────────────────────────────────────
async function createWindow() {
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
    const distPath = path.join(__dirname, '../dist');
    await startLocalServer(distPath, 5173);
    mainWindow.loadURL('http://localhost:5173');
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
  if (!downloadedFilePath || !fs.existsSync(downloadedFilePath)) {
    autoUpdater.quitAndInstall();
    return;
  }

  // Bypass Squirrel.Mac (which rejects ad-hoc signatures) by installing directly
  // via unzip + ditto, then relaunching.
  const { exec } = require('child_process');
  const appPath = app.getPath('exe').split('.app')[0] + '.app';
  const tmpDir = path.join(app.getPath('temp'), 'jonah-update-' + Date.now());

  const script = [
    `mkdir -p "${tmpDir}"`,
    `unzip -q "${downloadedFilePath}" -d "${tmpDir}"`,
    `NEW_APP=$(find "${tmpDir}" -name "*.app" -maxdepth 1 | head -1)`,
    `ditto "$NEW_APP" "${appPath}"`,
    `rm -rf "${tmpDir}"`,
    `open "${appPath}"`,
  ].join(' && ');

  exec(script, (err) => {
    if (err) {
      console.error('[updater] custom install failed:', err.message);
      sendUpdaterStatus({ status: 'error', message: err.message });
    } else {
      app.exit(0);
    }
  });
});

let deferInstall = false;

ipcMain.handle('updater:defer', () => {
  deferInstall = true;
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

// ─── IPC: YouTube RTMP streaming via FFmpeg ──────────────────────────────────
let ffmpegProcess = null;
let isStopping = false;

function sendStreamStatus(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('youtube:stream-status', payload);
  }
}

ipcMain.handle('youtube:start-stream', async (_event, rtmpUrl) => {
  if (!ffmpegPath) {
    sendStreamStatus({ status: 'error', error: 'FFmpeg not found' });
    return false;
  }
  if (ffmpegProcess) {
    // Already streaming — kill old process first
    try { ffmpegProcess.kill('SIGTERM'); } catch {}
    ffmpegProcess = null;
  }

  sendStreamStatus({ status: 'starting' });
  isStopping = false;

  try {
    const args = [
      '-re',
      '-i', 'pipe:0',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-tune', 'zerolatency',
      '-b:v', '4500k',
      '-maxrate', '4500k',
      '-bufsize', '9000k',
      '-g', '60',
      '-keyint_min', '60',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '44100',
      '-f', 'flv',
      rtmpUrl,
    ];

    ffmpegProcess = spawn(ffmpegPath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    ffmpegProcess.stderr.on('data', (data) => {
      const msg = data.toString();
      // FFmpeg logs progress to stderr — detect "frame=" as sign of active streaming
      if (msg.includes('frame=')) {
        sendStreamStatus({ status: 'streaming' });
      }
    });

    ffmpegProcess.on('error', (err) => {
      console.error('FFmpeg process error:', err);
      sendStreamStatus({ status: 'error', error: err.message });
      ffmpegProcess = null;
    });

    ffmpegProcess.on('close', (code) => {
      if (code !== 0 && code !== null) {
        sendStreamStatus({ status: 'error', error: `FFmpeg exited with code ${code}` });
      } else {
        sendStreamStatus({ status: 'stopped' });
      }
      ffmpegProcess = null;
    });

    return true;
  } catch (err) {
    console.error('Failed to start FFmpeg:', err);
    sendStreamStatus({ status: 'error', error: err.message });
    return false;
  }
});

ipcMain.handle('youtube:stream-chunk', async (_event, chunk) => {
  if (isStopping || !ffmpegProcess || !ffmpegProcess.stdin || ffmpegProcess.stdin.destroyed) return;
  try {
    const buf = Buffer.from(chunk);
    // Handle backpressure: if write returns false, wait for drain
    if (!ffmpegProcess.stdin.write(buf)) {
      await new Promise((resolve) => {
        if (ffmpegProcess && ffmpegProcess.stdin) {
          ffmpegProcess.stdin.once('drain', resolve);
        } else {
          resolve();
        }
      });
    }
  } catch (err) {
    console.error('FFmpeg stdin write error:', err);
  }
});

ipcMain.handle('youtube:stop-stream', async () => {
  if (!ffmpegProcess) return;
  isStopping = true;
  try {
    // Close stdin to signal EOF — FFmpeg will flush and exit gracefully
    if (ffmpegProcess.stdin && !ffmpegProcess.stdin.destroyed) {
      ffmpegProcess.stdin.end();
    }
    // Kill after 5s timeout if still running
    const proc = ffmpegProcess;
    setTimeout(() => {
      try { if (proc && !proc.killed) proc.kill('SIGKILL'); } catch {}
      isStopping = false;
    }, 5000);
  } catch (err) {
    console.error('FFmpeg stop error:', err);
    isStopping = false;
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

app.on('before-quit', () => {
  if (localServer) { try { localServer.close(); } catch {} localServer = null; }

  // Deferred install: run custom installer on quit (bypasses Squirrel.Mac)
  if (deferInstall && downloadedFilePath && fs.existsSync(downloadedFilePath)) {
    const { exec } = require('child_process');
    const appPath = app.getPath('exe').split('.app')[0] + '.app';
    const tmpDir = path.join(app.getPath('temp'), 'jonah-update-' + Date.now());
    const script = [
      `mkdir -p "${tmpDir}"`,
      `unzip -q "${downloadedFilePath}" -d "${tmpDir}"`,
      `NEW_APP=$(find "${tmpDir}" -name "*.app" -maxdepth 1 | head -1)`,
      `ditto "$NEW_APP" "${appPath}"`,
      `rm -rf "${tmpDir}"`,
      `open "${appPath}"`,
    ].join(' && ');
    exec(script); // fire-and-forget: app is already quitting
  }
});
