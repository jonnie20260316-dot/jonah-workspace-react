# Jonah Workspace React — Session Log

A running log of all work done in this React + Vite + Electron repo.
Newest sessions at the top.

---

## 2026-04-07 | v1.0.10 — Cross-Device Sync Fix (Drawing Tool) + FAB UX + YouTube Studio Errors — (1) Drawing tool shapes/connectors/text/frames now sync across devices via surface-elements sync category fix; (2) FAB menu shows "(限一個)" labels on unique blocks (journal/kit/intention) with toast prevention on duplicates; (3) YouTube Studio transitionBroadcast now surfaces real API errors + formatDate() fixes "Invalid Date" in broadcasts list. 2 commits, 5 files, +82 net lines. Build ✓ 1813 modules.

## 2026-04-06 | v1.0.9 — Daily/Global block split + Date Peek Modal + live date refresh on useBlockField — Journal/KIT/Intention/Tasks now refresh instantly on date switch; global blocks unaffected; 4-tab peek modal in sidebar. Build ✓ 1813 modules.

## 2026-04-06 | Screen Recording Free Workaround + Release Cleanup — Added focus/visibility permission re-checks to VideoCaptureBlock, a direct "Open System Settings" action via new Electron IPC, and clearer bilingual guidance for macOS Screen Recording permission. Added `DatePeekModal` to restore a missing sidebar component and clear the build gate. Also cleaned up release metadata (`author` in package.json), documented macOS release setup in README, and kept the custom installer as a dev/transitional fallback rather than the shipped path. Build ✓ 1813 modules. Lessons locked: EB-RELEASE-SCHEMA-1, BUILD-IMPORT-1, SCREEN-PERMISSION-1. See history/recaps/2026-04-06-system-changes-recap.md and history/lessons/2026-04-06-lessons-locked.md

## 2026-04-04 | Phase 10 Polish — Complete (Undo/Redo + Minimap) — High-priority whiteboard features shipped: (1) Undo/Redo system with Cmd+Z/Cmd+Shift+Z keyboard shortcuts, history capped at 20 snapshots (UNDO_LIMIT from constants.ts), pure Zustand store with zero dependencies (avoids circular imports), selective action tracking (add/delete/duplicate/draw only, not drag/resize); push sites: 7 locations across Canvas (Cmd+D, Delete/Backspace), ContextMenu (duplicate, deleteSelected), FAB (handleAddBlock), useDrawTool (connector/brush/text/shapes in onPointerUp). (2) Minimap: fixed 160×120px SVG thumbnail in bottom-right corner (z-index 180, above ToolBar, below FloatingTopBar), shows non-archived blocks (white semi-transparent rects), frames (colored from ZONE_PALETTES), viewport rect (blue stroke showing visible area), click-to-navigate (converts SVG pixel coords to board coords, centers view), toggle button (🗺) to show/hide panel, frosted glass styling (backdrop-filter blur 12px, matches FloatingTopBar design). New files: src/stores/useHistoryStore.ts (50 lines), src/components/Minimap.tsx (185 lines). Modified files: Canvas.tsx (+15), ContextMenu.tsx (+4), FAB.tsx (+4), useDrawTool.ts (+15), App.tsx (+2), workspace.css (+38). 8 files total, +604 net lines. Build ✓ 1812 modules, 0 TypeScript errors. Commit: e7fdd91. See history/recaps/2026-04-04-phase-10-polish-undo-redo-minimap.md

## 2026-04-04 | AI Chat Block — Complete (Claude.ai + ChatGPT Webview) — New block type embedding claude.ai and chatgpt.com via Electron webview; single block with Claude/ChatGPT tab switcher; `partition="persist:aichat"` for shared login session; header-stripping in session handlers to bypass X-Frame-Options/CSP frame-ancestors; tab state persisted via GLOBAL_KEY_PREFIXES; bilingual UI with graceful non-Electron fallback. Layout refinements: CSS `.type-ai-chat .block-body` rule (padding: 0, overflow: hidden, display: flex); webview uses flex layout instead of percentage heights for Electron compatibility. 3 commits: fa46698 (initial), e614a66 (layout fix), 1b01fad (flex refinement). 7 files changed, +143 lines net. Build ✓ 1797 modules. Prevention rules: WEBVIEW-FLEX-1, BLOCK-BODY-CSS-HOOK, RENDER-VERIFY-GATE. See history/recaps/2026-04-04-ai-chat-block-final.md

## 2026-04-04 | Persistence Stability + Update Check Fix (v1.0.7 SHIPPED) — Three critical persistence issues fixed: (1) GitHub settings lost across quit/restart — added github-sync-* keys to GLOBAL_KEYS + boot-time migration for stranded session-scoped keys; (2) sync kills active recordings — implemented granular block merge (JSON comparison + per-block updates) to preserve React component identity instead of full array replacement, plus same-device sync skip to avoid rehydration on own data; (3) macOS screen recording permission reset — added permission status detection + bilingual user guidance banner. Update checker broken: dev-app-update.yml missing from bundled app → created + added to electron-builder.yml; error reporting silent → modified updater:check handler to pass error message to UI. Version bump 1.0.6 → 1.0.7. Both x64+arm64 DMGs built successfully. GitHub release created with all artifacts. 12 files changed, +247 lines; build ✓ 1795 modules. See history/recaps/2026-04-04-v1.0.7-persistence-update-check-fix.md

## 2026-04-04 | GitHub REST API Sync Fix (v1.0.6) — Root-cause fix for git sync never working: replaced `child_process.exec('git push ...')` (cannot authenticate HTTPS interactively, hangs 30s silently) with direct GitHub Contents API calls (GET + PUT with PAT, 15s timeout, immediate error); new GearMenu UI (repo URL + PAT password input, inline errors); auto-migration from old git-sync-remote key; added 2-minute auto-backup interval; quit sync now max 15s instead of 30s; 9 files, -109 net lines; build ✓ 1795 modules; new prevention rule GIT-EXEC-1; v1.0.6 DMG built

---

## 2026-04-04 | Data Persistence Fixes (v1.0.5) — Complete Fix for 6 Critical Issues — Fixed localStorage flush race condition: removed localServer.close() from before-quit, moved to will-quit, added flushStorageData() to app:request-quit + 5s watchdog; added file backup safety net (backupToFile/restoreFromFile to userData/jonah-workspace-backup.json); auto-restore from backup on boot if localStorage empty; port retry fallback 5173–5180; Save button now triggers backup + git sync + visual checkmark feedback; fixed text-scale storage (added to GLOBAL_KEYS); 9 files changed (+136 lines); layered persistence: immediate localStorage → manual Save → background 30s git debounce → quit flush+git → boot restore+pull; build ✓ 1795 modules

## 2026-04-04 | Git-Backed Data Sync (Multi-Device Backup with Version Control) — Implemented optional Git sync layered on localStorage: user enables in GearMenu, picks local folder, enters GitHub remote URL; data auto-commits after 30s of changes (debounced); app boot auto-pulls; app quit does final commit; write flow: mutation → localStorage → git commit+push → GitHub; read flow: boot/quit signal → git pull → rehydrate stores; 12 files changed (+658 lines); IPC: git:init/commit/push/pull/status handlers + quit watchdog; Zustand: git state + 5 actions; hooks: useSyncBoot extended + new useGitQuit; GearMenu: Git Sync section with setup wizard + status display; build ✓ 1795 modules

## 2026-04-04 | Video Source Switch Fix — Frozen Preview + Black Screen — User reported: clicking source toggle froze preview and turned screen black; root cause: switchSource() reassigned srcObject on video elements but never called .play() (browser pauses when srcObject changes); fixed: added .play() after every srcObject assignment, cleared screenVideoRef on camera switch, updated useStreamStore to sync YouTube block; new prevention rules VIDEO-SRCOBJECT-1 + STORE-SYNC-1; 1 file, +8 lines; build ✓ 1794 modules

## 2026-04-04 | YouTube RTMP Stream Fix — Race Condition on Stop — User reported 停止推流 crash (ERR_STREAM_WRITE_AFTER_END); race condition between async IPC handlers (stop closes stdin, chunks still sending); added isStopping flag guard; RTMP-Stop-Safe prevention rule created; 1 file, +5 lines; build ✓ 1794 modules

## 2026-04-04 | YouTube Studio Block — Selectable Upcoming Broadcasts — User selection state + clickable list items; active broadcast priority (live/testing always displayed); detail panel refactored for selected `ready` broadcasts; 1 file, +24 lines; build ✓ 1794 modules

## 2026-04-04 | YouTube Studio Broadcast Creation + RTMP Streaming — Inline form for creating broadcasts (title + privacy select); three YouTube API calls in sequence (createBroadcast → createLiveStream → bindBroadcast); FFmpeg RTMP streaming pipeline: MediaRecorder → 1s chunks → Electron IPC → FFmpeg stdin; new useStreamStore Zustand store for sharing MediaStream between VideoCaptureBlock and YouTubeStudioBlock; 5 files changed (+399 lines); build ✓ 1794 modules

## 2026-04-04 | YouTube Studio API Integration — Replaced iframe stub with YouTube Live Streaming API v3 dashboard; Google OAuth2 via Electron BrowserWindow (auth code exchange in main process); token management with auto-refresh; dashboard: broadcast status pill, viewer count, stream health, Go Live/End Stream buttons; 30s auto-poll; 5 files changed; build ✓ 1793 modules

## 2026-04-04 | Space Text Input Fix — Space pan mode now guards against text input focus via isTextInputFocused(); typing space in journal/content/any block input restored; JW-39 added (Input-Focus Guard Before Global Key Hijacking); build ✓ 1792 modules

## 2026-04-04 | Session wrap-up — 15 commits across 6 lanes: PiP 8-bug audit, Electron screen capture IPC picker, Opt+drag resize scale fix, PinnedHUD fixed overlay with drag reorder, OBS-style seamless source switching (MediaStream track replacement), YouTubeStudioBlock iframe embed; JW-36/37/38 added; 1792 modules ✓

## 2026-04-04 | Beta/Stable Channel + Non-Disruptive Updates — Two-channel release system (version-string based); removed auto-download from update-available handler; added user-controlled download/defer IPC flow; updated AppUpdater UI (available → user downloads → ready with defer option); made GitHub repo public; fixed youtube-studio BlockType icon sync error; 5 files modified, build ✓ 1792 modules

## 2026-04-04 | Space Pan Fix — Block drag/resize yielded to canvas pan when Space held; added `if (document.body.dataset.panMode) return;` guard to useBlockDrag.ts + useBlockResize.ts; added `body[data-pan-mode] .board-block { cursor: grab }` CSS; diagnosed incomplete redo from 2026-04-03; pointer capture coordination resolved; build ✓ 1790 modules

## 2026-04-04 | PiP 畫中畫 + Real Device Enumeration — Screen + camera simultaneous recording; draggable PiP overlay (20%, rounded rect, 4:3 aspect); canvas.captureStream() composition to single output video; replaced hardcoded device lists with live navigator.mediaDevices.enumerateDevices(); device dropdown auto-updates on plug/unplug; devicechange listener cleanup (JW-28); build ✓ 1790 modules

## 2026-04-03 | Screen Recording — Added Camera/Screen mode toggle to VideoCaptureBlock; getDisplayMedia + Web Audio API mixer (system audio + mic); per-session audio toggles; mode-aware UI (objectFit, placeholder, SCR/REC indicator, source badge); bilingualized all strings; build ✓ 1790 modules

## 2026-04-03 | Language Switch Bug Fix — 11 components missing useLang() subscription; added hook to ContentBlock, IntelBlock, IntentionBlock, KitBlock, MetricsBlock, ProjectsBlock, PromptedNotesBlock, SpotifyBlock, ThreadsBlock, Canvas, SyncStatusIndicator; all pick() calls now re-render on lang change; build ✓

## 2026-04-03 | Context migration — CLAUDE.md + full history (recaps/lessons) copied from main workspace; React repo now self-contained with all 34 prevention rules and complete session history

## 2026-04-03 | Redo Lost React Work + Electron Fixes — Recovered Phase 9B/9C/font/calendar/pan after data loss (uncommitted work deleted); fixed electron-updater bundle; added mic/camera plist entries; 7 commits pushed; JW-34 added (Commit-Before-Delete)

## 2026-04-03 | Block Font Scaling Fix — Audited 154 inline fontSize in 15 block components overriding CSS cascade; converted all to calc(Xpx * var(--text-scale)); Opt+drag and global scale now work for ALL content; JW-33 added; build ✓ 1791 modules

## 2026-04-03 | Font Size Settings — Added scale control (0.82–1.25×) to React app; Gear menu "字型大小 / Font Size" row with 5 preset buttons; CSS --text-scale variable applied to block content; localStorage persisted; React build ✓ 1791 modules

## 2026-04-03 | Calendar Centering Fix — FloatingTopBar transform creates containing block; fixed via React portal + getBoundingClientRect() + position:fixed; clamped to viewport edges; JW-32 added

## 2026-04-03 | React Dev Launcher Setup — jw-dev/jw-build shell aliases; ~/.local/bin/jw-react-launcher script; Automator app updated to React

## 2026-04-03 | Phase 9C — Space pan fix (data-pan-mode body flag) + block header hierarchy (17px/700 title, 32px accent-tinted icon pill)

## 2026-04-03 | Phase 9B — Visual parity: 30px radius, backdrop blur, gradient headers, 10% larger blocks, smart date (Today/Yesterday/Tomorrow/Wed. 04.03), 48 bilingual strings across 11 files; 1791 modules ✓

## 2026-04-02 | Phase 8: Conflict Resolution UI — ConflictInfo type, useSyncStore conflictInfo + setConflict/clearConflict, ConflictResolutionModal; 5 files, 0 TS errors

## 2026-04-02 | Phase 7: Gap Remediation — SVG timer ring, daily stats, session log, calendar picker, timer settings, useLang bilingual system; 7 new files, 1789 modules ✓; JW-30+JW-31 added

## 2026-04-02 | Phase 6: Apple-Quality UI Overhaul — Design tokens, animations, 8 shell UI components, 6 color themes; 20+ files, 0 TS errors

## 2026-04-02 | Phase 5: Sync Middleware — File System API, selective sync, Cases A/B/C conflict detection; 74 modules

## 2026-04-02 | Phase 3: Blocks Functional — 8 broken blocks fixed (Tasks/Timer/Projects/ThreadsIntel/PromptedNotes/Spotify/VideoCapture/Intel); deep audit 20+ bugs; JW-24–JW-29 added

## 2026-04-02 | React Migration Kickoff — Full planning, URD, pre-flight checklist; zero workspace.html changes

## 2026-04-04 | Data persistence + auto-update fix — local HTTP server in prod (same origin as dev), forceDevUpdateConfig for unsigned app; v1.0.3 release

## 2026-04-04 | Auto-update 404 fix — electron-builder artifactName explicit; new prevention rule EBUILD-1

## 2026-04-04 | Squirrel.Mac bypass — custom ditto installer for unsigned auto-update; 5 audit bugs fixed; v1.0.4 released
