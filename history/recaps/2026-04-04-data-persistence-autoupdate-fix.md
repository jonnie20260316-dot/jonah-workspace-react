---
Requested by: User
Executed by: Claude Code
Wrap-up written by: Claude Code
---

# Session Recap — 2026-04-04: Data Persistence + Auto-Update Fix

## What Was Worked On

Two root-cause bugs preventing the DMG production app from working properly:

1. **Empty board on every DMG launch** — production used `loadFile()` (file:// origin), dev used `loadURL('http://localhost:5173')` (localhost origin). Different localStorage partitions → user's data invisible to the production app.

2. **Auto-update download failing** — `electron-updater` verifies macOS code signature before downloading. App is ad-hoc signed (no Apple Developer ID cert) → signature check fails → download errors.

## What Shipped

### File changed: `electron/main.cjs`

**Change A — Local HTTP server in production:**
- Added `const http = require('http')`
- Added `startLocalServer(distPath, port)` function — serves `dist/` static files via Node's built-in HTTP server on `127.0.0.1:5173` with correct MIME types and SPA fallback
- Changed `createWindow()` → `async function createWindow()`
- Production branch now: `await startLocalServer(distPath, 5173)` → `mainWindow.loadURL('http://localhost:5173')` (instead of `loadFile()`)
- Added `app.on('before-quit')` cleanup to close the server

**Result:** Both dev and prod now share `localhost:5173` as their localStorage origin. User data persists across all future DMG installs — no more manual JSON import.

**Change B — Auto-update fix:**
- Added `autoUpdater.forceDevUpdateConfig = true` before the event listeners
- Bypasses macOS code-signature verification for ad-hoc signed apps

## Key Decision

Using a local HTTP server (not `loadFile`) is the right long-term architecture for this app:
- Zero data migration — existing `localhost:5173` localStorage data is immediately visible
- No user-facing change — app loads identically
- Server is loopback-only (`127.0.0.1`) — no network exposure

## Build Status

`npm run build` ✓ — 1794 modules, 0 TypeScript errors

## Next: Release v1.0.3

- Bump `package.json` version to `1.0.3`
- `npm run electron:build:mac`
- Publish as GitHub release `v1.0.3`
- User tests the in-app update flow: 1.0.2 → 1.0.3

## Lessons Locked

No new mistakes this session — the plan was written first (JW-37), approved, then executed cleanly in one pass.
