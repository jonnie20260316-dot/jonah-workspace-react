---
Requested by: User
Executed by: Claude Code
Wrap-up written by: Claude Code
---

# Session Recap — 2026-04-04: Git-Backed Data Sync Implementation

## What Was Worked On

### Planning Phase (30 min)
- User asked: "手機版製作還要很久嗎?" (mobile version timeline)
- Determined mobile version is future; current focus: multi-device sync on desktop
- User clarified need: **不是為了手機版，我想解決在電腦端的儲存問題** (not for mobile—solve desktop multi-device sync)
- Requirement clarified: backup + version history + cross-device sync
- Created detailed implementation plan covering 12 files, no new npm dependencies

### Implementation (2.5 hours)

**Lane 1: Type System & Constants**
- Added `GitSyncStatus` type ("idle" | "syncing" | "synced" | "error" | "conflict" | "auth-error")
- Extended `Window.electronAPI` interface with 8 new git methods
- Added 3 GLOBAL_KEYS for persistent git config (enabled, dir, remote)

**Lane 2: Electron IPC Layer**
- Implemented `runGit()` helper wrapping `child_process.exec()` — never rejects, returns `{ok, stdout, stderr}`
- Added 5 IPC handlers:
  - `git:init` — initializes repo, sets identity, configures remote, writes `.gitignore`
  - `git:commit` — stages sync JSON, commits with ISO timestamp
  - `git:push` — pushes with `--set-upstream` (handles first-time push)
  - `git:pull` — fetches + merges with `--ff-only` (never destructive)
  - `git:status` — returns branch, remote URL, last commit info
- Added quit watchdog: `before-quit` sends `app:about-to-quit` signal, waits 5s for renderer to respond with `app:request-quit`

**Lane 3: Sync Utilities & Store State**
- Wrote `gitCommitAndPush()` — wraps git commit+push, detects auth errors
- Wrote `gitPullAndApply()` — reads updated sync JSON, applies via `applySyncPayload()`
- Implemented debounce scheduling: `scheduleGitSync()` with 30s timer, cancels previous if one exists
- Used ref-pattern to avoid circular Zustand dependency: `setUseSyncStoreRef()` called on store init

**Lane 4: Zustand Store Extensions**
- Added 6 new git state fields to `useSyncStore`
- Implemented 5 git actions: `setGitEnabled/Dir/Remote`, `gitSetup()`, `gitSyncNow()`, `gitSyncOnQuit()`
- Added `scheduleGitSync()` triggers in:
  - `useBlockStore` — all block mutations (add, update, remove, archive, restore, bringToFront)
  - `useSessionStore` — date navigation

**Lane 5: App Hooks**
- Extended `useSyncBoot()` — git pull on app boot if `gitEnabled && gitDir`
- Created new `useGitQuit()` hook — listens for `app:about-to-quit`, runs `gitSyncOnQuit()`, calls `requestQuit()`
- Wired into `App.tsx`

**Lane 6: UI / GearMenu**
- Added Git Sync section (Electron-only, below existing Sync section)
- Toggle On/Off → shows git state (folder, last synced time, errors)
- Input field for GitHub remote URL
- Two modes:
  - Setup: "設定 Git" button calls `gitSetup(pickedFolder, remoteUrl)`
  - Running: "立即同步" button for manual sync
- Status line shows last synced time or error

## What Shipped

- ✅ Full Git sync feature integrated into Jonah Workspace v1.0.4+
- ✅ 12 files modified, 0 TypeScript errors
- ✅ `npm run build` passes (1795 modules)
- ✅ Commit `f1a9847` pushed to `origin/main`

**Architecture Summary:**
```
Write: mutation → localStorage → debounce 30s → git commit+push → GitHub
Read:  boot → git pull → if changed → rehydrateStores()
Quit:  app:about-to-quit → git commit+push (5s watchdog) → requestQuit()
```

## Key Design Decisions

1. **Optional/Opt-in** — localStorage remains default, git is user-configurable toggle
2. **No breaking changes** — existing file-sync and browser API paths unaffected
3. **Non-destructive** — `--ff-only` on pull prevents auto-merge conflicts
4. **30s debounce** — balances responsiveness vs GitHub rate limits (viewport pan excluded)
5. **Watchdog on quit** — prevents app hang if renderer unresponsive (5s timeout forces quit)

## User Testing Path

1. Enable toggle in GearMenu
2. Pick local folder (or reuse existing sync folder)
3. Enter GitHub repo URL (must exist, can be private)
4. Click "設定 Git" → initializes .git + .gitignore + adds remote
5. Make changes → auto-commit after 30s
6. On different Mac: open app → auto-pull on boot
7. Verify data appears from first Mac ✓

## No Mistakes / No Lessons Locked

Implementation was straightforward:
- Avoided circular dependency with ref-pattern (not a mistake, just design consideration)
- Fixed lint warnings (`_event` prefix) on all IPC handlers
- TypeScript built clean on first try
- No runtime errors during implementation

## What Remains To Do

- User testing on actual 2-Mac scenario (this session was planning + implementation only)
- Stress test: rapid start/stop cycles on RTMP stream with git sync active
- Error recovery: FFmpeg crash during RTMP + git sync mid-commit
- Documentation: add git setup walkthrough to README

---

**Session Duration:** ~3 hours (planning + implementation)  
**Files Modified:** 12  
**Lines Added:** ~658  
**Build Status:** ✓ Pass  
**Commits:** 1 (`f1a9847`)  
**Push Status:** ✓ To origin/main
