# Architecture Reference

Quick lookup for constants, storage keys, and directory layout.

## Key Constants (React)

```
Storage prefix:    "jonah-workspace:v2:"
LAYOUT_VERSION:    "2026-03-24-f"
GRID:              24
MIN_ZOOM:          0.07 / MAX_ZOOM: 6.0
VIEWPORT_PADDING:  2400
DEFAULT_LANG:      "zh"
```

Defined in: `src/constants.ts`

## GLOBAL_KEYS (persist across dates)

```javascript
"blocks", "viewport", "board-size", "project-board", "lang", "snap",
"overlap", "hero-collapsed", "timer-state", "timer-base-minutes",
"active-date", "session-migration-done", "layout-version",
"timer-settings", "timer-daily-target", "timer-sound",
"threads-intel-records",
"threads-intel-archived", "threads-intel-archive-days",
"history-compact", "sidebar-category-order",
"device-id", "sync-meta", "timer-height-migrated-v1",
"git-sync-enabled", "git-sync-dir", "git-sync-remote",
"github-sync-enabled", "github-sync-repo", "github-sync-token",
"text-scale"
```

GLOBAL_KEY_PREFIXES (dynamic keys matched by prefix):
```javascript
["timer-sessions:", "timer-sounds:", "prompted-notes-config:", "prompted-notes-entries:", "spotify-presets:", "spotify-ui:", "content-draft-history:", "video-capture-settings:", "vc-saved-videos:"]
```

Session-scoped keys use pattern: `session:{YYYY-MM-DD}:{blockId}:{field}`

## Directory Layout

```
src/
  blocks/          — 17 block components + BlockShell + BlockRegistry
  components/      — Canvas, FloatingTopBar, DateNav, CalendarModal, GearMenu, FAB, Sidebar, etc.
  hooks/           — useLang, useBlockDrag, useBlockResize, ...
  stores/          — useBlockStore, useSessionStore, useViewportStore, useSyncStore
  styles/          — tokens.css (design tokens)
  utils/           — i18n (pick()), blockIcons, storage helpers
  types.ts         — Block, Session, etc.
  constants.ts     — shared constants
  workspace.css    — all component styles
electron/          — main.js, preload.js
electron-builder.yml — packaging config
```

## Key Files

| File | Purpose |
|------|---------|
| `src/hooks/useBlockField.ts` | Block field persistence — date-scoped or global, live-refreshes on date change |
| `src/utils/storage.ts` | Storage routing — `_activeDate`, GLOBAL_KEYS, `loadFieldForDate()` |
| `src/blocks/VideoCaptureBlock.tsx` | Camera/screen recording, PiP compositing, seamless source switching |
| `src/blocks/YouTubeStudioBlock.tsx` | YouTube Live API dashboard (OAuth, broadcast lifecycle, RTMP) |
| `src/stores/useSessionStore.ts` | `activeDate`, `setActiveDate()`, `navigateDate()` |
| `src/components/Canvas.tsx` | Viewport pan/zoom, data-pan-mode, filters pinned blocks |
| `src/blocks/BlockShell.tsx` | Block header, color themes, pin button |
| `src/blocks/BlockRegistry.ts` | 20 block types, default sizes |
| `electron/main.cjs` | Electron main: screen capture, update, YouTube OAuth2, GitHub API IPC |
| `src/constants.ts` | Shared constants (GLOBAL_KEYS, LAYOUT_VERSION, GRID, etc.) |
