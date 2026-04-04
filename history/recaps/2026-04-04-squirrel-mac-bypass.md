---
Requested by: User
Executed by: Claude Code
Wrap-up written by: Claude Code
---

# Session Recap — 2026-04-04: Squirrel.Mac Bypass + Custom Installer Hardening

## What Was Worked On

### Lane 1: Fix auto-update install (Squirrel.Mac signature rejection)

User clicked "立即重啟安裝 1.0.3" and got:
> "Code signature at URL file:///Users/jonnie/Library/Caches/co... did not pass validation"

**Root cause (audited):** `autoUpdater.quitAndInstall()` hands off to Electron's native Squirrel.Mac framework, which calls macOS Security APIs to validate the app's code signature. Ad-hoc signatures are build-unique — every new build has a different hash, so the update's signature never matches the running app's identity.

`forceDevUpdateConfig = true` does NOT fix this. It only controls `isUpdaterActive()` — the comment in the code was wrong.

**Fix:** Custom installer in `updater:install` IPC handler bypasses Squirrel.Mac entirely:
- Capture `info.downloadedFile` in `update-downloaded` event
- Run shell script: `unzip → find .app → ditto → xattr → open → app.quit()`
- Defer path (`before-quit`) uses same script

### Lane 2: Audit + harden the custom installer (5 bugs found before testing)

User asked to audit before testing. 5 issues found and fixed:

| # | Issue | Fix |
|---|-------|-----|
| 1 | `app.exit(0)` skips `before-quit` → HTTP server stays open → port 5173 conflict when new app starts | Changed to `app.quit()` |
| 2 | `ditto` preserves `com.apple.quarantine` from zip files → Gatekeeper dialog on relaunch | Added `xattr -dr com.apple.quarantine "${appPath}"` after ditto |
| 3 | `&&` chain: `rm -rf` cleanup skipped if `ditto` fails → tmpDir leak | Rewrote with `set -e` + explicit cleanup on failure path |
| 4 | `find` returning empty → `ditto "" "${appPath}"` → cryptic error | Added explicit `[ -z "$NEW_APP" ] && exit 1` guard |
| 5 | No status sent to renderer during 30-60s install → UI shows nothing | Added `sendUpdaterStatus({ status: 'downloading', percent: 100 })` before exec |

### Lane 3: User added git sync to electron/main.cjs (outside this session)

The user independently added git-based sync functionality to `electron/main.cjs`:
- `runGit(args, cwd)` helper — wraps `exec('git ...')`, never rejects
- IPC handlers: `git:init`, `git:commit`, `git:push`, `git:pull`, `git:status`
- Quit watchdog: `before-quit` pauses quit, signals renderer (`app:about-to-quit`), waits for renderer to finish git sync, then forces quit after 5s timeout
- `app:request-quit` handler: renderer calls this after sync is complete

## What Shipped

- `electron/main.cjs` — custom installer logic, all 5 audit fixes, git sync IPC handlers
- `v1.0.4` released to GitHub with hardened installer

## Lessons Locked

New prevention rule: **SQUIRREL-BYPASS-1**
- Never use `quitAndInstall()` for unsigned/ad-hoc signed Electron apps on macOS
- `forceDevUpdateConfig` does NOT bypass Squirrel.Mac — the comment was wrong
- Must capture `downloadedFile` and use custom `ditto` installer
- See: `history/lessons/2026-04-04-lessons-locked-squirrel-mac.md`
