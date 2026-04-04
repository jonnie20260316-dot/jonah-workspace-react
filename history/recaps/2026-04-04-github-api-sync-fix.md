# 2026-04-04 Session: GitHub REST API Sync Fix (v1.0.6)

**Requested by:** User
**Executed by:** Claude Sonnet 4.6
**Wrap-up written by:** Claude Sonnet 4.6

## Summary

User reported: git sync never worked. Set up remote URL, waited 30s, clicked Sync Now — nothing appeared on GitHub. Also reported data still disappearing after app close.

## Root Cause Identified

`runGit` used bare `exec('git push origin main --set-upstream', { timeout: 30000 })` with HTTPS remote. Git cannot authenticate interactively through `exec`. Push hung 30 seconds silently, then failed. The 30s hang also made the quit watchdog fire before `requestQuit()` was called, weakening the localStorage flush guarantee.

## What Shipped

### GitHub REST API sync (replaces git binary entirely)

**File:** `electron/main.cjs`
- Removed: `runGit()` helper + 5 `git:*` IPC handlers (git:init/commit/push/pull/status)
- Added: `github:get-file` handler — GET `/repos/{owner}/{repo}/contents/{file}`, 15s timeout, immediate error response
- Added: `github:put-file` handler — PUT with base64 content + SHA, immediate 200/201 or error

**File:** `electron/preload.cjs`
- Removed: `gitInit`, `gitCommit`, `gitPush`, `gitPull`, `gitStatus`
- Added: `githubGetFile`, `githubPutFile`

**File:** `src/utils/sync.ts`
- Removed: `gitCommitAndPush`, `gitPullAndApply`, old debounce
- Added: `parseGithubRepo()` — accepts full URL or `owner/repo` format
- Added: `githubPush()` — GET SHA → PUT payload to GitHub
- Added: `githubPull()` — GET file → applySyncPayload
- `scheduleGitSync()` kept as function name (import compatibility) but now calls `githubSyncNow`

**File:** `src/stores/useSyncStore.ts`
- Replaced git state fields (`gitEnabled`, `gitDir`, `gitRemote`, `gitSyncStatus`, `gitLastSyncAt`, `gitError`) with github equivalents
- New storage keys: `github-sync-enabled`, `github-sync-repo`, `github-sync-token`
- Auto-migration: reads old `git-sync-remote` key and parses owner/repo on first boot
- New actions: `githubSetup`, `githubSyncNow`, `githubSyncOnQuit`

**File:** `src/components/GearMenu.tsx`
- Removed: folder picker (openDirectory), local path display
- Added: repo URL input (accepts full GitHub URL), PAT password input
- Error shown inline (not alert()) so user sees HTTP 401 immediately

**File:** `src/hooks/useSyncBoot.ts`
- Boot now calls `githubSyncNow` instead of git-based sync
- Added 2-minute auto-backup interval (insurance against sudden shutdown)

**File:** `src/hooks/useGitQuit.ts`
- Quit now calls `githubSyncOnQuit` (15s max, not 30s git exec)

**File:** `src/components/FloatingTopBar.tsx`
- Save button calls `githubSyncNow` instead of `gitSyncNow`

**File:** `src/types.ts`
- Window.electronAPI: replaced 5 git methods with `githubGetFile` + `githubPutFile`

## New Sync Flow (Deterministic)

```
Setup:       Enter GitHub URL + PAT → githubSetup() → save to localStorage
Auto-sync:   Block mutation → 30s debounce → githubSyncNow()
             Boot → githubSyncNow() (pull first, then push)
             Quit → backupToFile() → githubSyncOnQuit() (push only)
             Every 2min → backupToFile() (new auto-backup)
Pull:        GET /repos/{owner}/{repo}/contents/jonah-workspace-sync.json → decode base64 → applySyncPayload
Push:        GET sha → PUT base64(payload) → immediate 200/201 or error message
```

## Build Status

✅ **Build passes:** 1795 modules, 0 TypeScript errors
✅ **Version bumped:** 1.0.5 → 1.0.6
✅ **Committed:** `c74dcb1`

## Files Modified

| File | Changes |
|------|---------|
| `electron/main.cjs` | Replace runGit + 5 git handlers with 2 GitHub API handlers |
| `electron/preload.cjs` | Bridge swap: git → github |
| `src/types.ts` | Window.electronAPI interface update |
| `src/utils/sync.ts` | Replace git helpers with githubPush/githubPull/parseGithubRepo |
| `src/stores/useSyncStore.ts` | Replace git state/actions with github; auto-migration |
| `src/components/GearMenu.tsx` | New GitHub sync UI (repo URL + PAT) |
| `src/components/FloatingTopBar.tsx` | Save → githubSyncNow |
| `src/hooks/useSyncBoot.ts` | Use githubSyncNow; add 2-min auto-backup |
| `src/hooks/useGitQuit.ts` | Use githubSyncOnQuit |

**Total:** 9 files, ~285 insertions, ~394 deletions (net: smaller + simpler)
