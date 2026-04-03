# React Phase 5 — Sync Middleware (2026-04-02)

Requested by: User (Jonnie)
Executed by: Claude Code (Sonnet)
Wrap-up written by: Claude Code (Haiku)

---

## What Shipped

Full port of the `workspace.html` iCloud folder sync system to React. Architecture: local-first, File System Access API, no backend.

### New Files

| File | Purpose |
|------|---------|
| `src/utils/syncIdb.ts` | IDB persistence for FileSystemDirectoryHandle across reloads |
| `src/utils/sync.ts` | SYNC_CATEGORIES (8), buildSyncPayload, filterPayloadForSync, applySyncPayload, getOrCreateDeviceId |
| `src/hooks/useSyncBoot.ts` | Auto-pull on boot (silent, autoMode=true, skips dialogs for Case A) |
| `src/components/SyncStatusIndicator.tsx` | Status dot in FloatingTopBar (syncing/synced/error/offline/conflict) |
| `src/components/SelectiveSyncModal.tsx` | 8-category checkbox modal, Case C danger warning |

### Modified Files

| File | Change |
|------|--------|
| `src/stores/useSyncStore.ts` | Full rewrite: push(), pull() with Cases A/B/C, initDeviceId, clearSyncHandle, rehydrateStores() |
| `src/components/GearMenu.tsx` | Sync section: device ID, last sync time, push/pull/disconnect buttons + SelectiveSyncModal |
| `src/components/FloatingTopBar.tsx` | SyncStatusIndicator added to right section |
| `src/App.tsx` | useSyncBoot() wired |
| `src/types.ts` | SyncCategory, SyncPayload, SyncStatus, SyncQueueItem added |
| `src/constants.ts` | sync-queue added to GLOBAL_KEYS (JW-8) |

---

## Sync Architecture

### Push flow
1. Get/request FileSystemDirectoryHandle (IDB cache → picker)
2. Request write permission
3. Build full payload via buildSyncPayload() — reads all GLOBAL_KEYS + GLOBAL_KEY_PREFIXES
4. Filter by selected categories if selective sync
5. Write jonah-workspace-sync.json to folder
6. Update syncMeta (lastPushedAt, pushCount++)

### Pull flow (Cases A/B/C from workspace.html)
- **Case B:** remote.pushedAt === syncMeta.lastPulledRemotePushedAt → "already up to date", no-op
- **Case C:** remote.pushCount < syncMeta.pushCount → danger confirm (remote older than local); autoMode never pulls
- **Case A:** Normal pull → optional confirm dialog → applySyncPayload() + rehydrateStores()

### Rehydration after pull
Calls `rehydrateStores()` which directly updates:
- useBlockStore.setState({ blocks })
- useViewportStore.setState({ viewport })
- useProjectStore.setState({ projectBoard })
- useSessionStore.setState({ lang })

### 8 Sync Categories
canvas, projects, notes, timer, intel, prompted, content, prefs

### IDB persistence
Database: `jonah-sync-handles`, store: `handles`, key: `sync-dir`
Non-fatal if IDB unavailable (private browsing) — fallback to picker every time.

---

## Build Status
- TypeScript: 0 errors
- Vite build: 74 modules, 312 KB (88 KB gzipped)

---

## No Errors / No Lessons Locked
No mistakes encountered this session. All 11 steps executed cleanly.

---

## What's Left
- Smoke test: Push from device A → Pull on device B → verify blocks/viewport appear
- Conflict Case C: Manually trigger and verify danger warning shows
- Selective sync: Uncheck "Preferences" on push, verify lang not overwritten on pull
- Phase 6 candidates: MetricsBlock dynamic values, DashboardBlock real content, full test suite
