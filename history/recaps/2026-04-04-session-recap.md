# Session Recap — 2026-04-04

Requested by: User
Executed by: Claude Code (Opus 4.6)
Wrap-up written by: Claude Code (Opus 4.6)

---

## Lanes of Work (15 commits)

### Lane 1: PiP + Screen Recording Bug Fixes
- Audited and fixed 8 bugs in VideoCaptureBlock PiP + screen recording
- Stale closure in rAF loop (pipPositionRef pattern)
- `display: none` → offscreen positioning for hidden video elements
- Missing autoPlay, effect cleanup, pre-cleanup, silent error swallowing
- **Files:** `src/blocks/VideoCaptureBlock.tsx`

### Lane 2: Electron Screen Capture
- Added `setDisplayMediaRequestHandler` to Electron main process
- Full screen capture (not just app window) via `screen:` prefix filtering
- IPC-based source picker: `screen:get-sources` + `screen:select-source`
- Screen source picker UI with thumbnails (Electron desktopCapturer)
- Switch Source button visible while streaming
- **Files:** `electron/main.cjs`, `electron/preload.cjs`, `src/blocks/VideoCaptureBlock.tsx`, `src/types.ts`

### Lane 3: Opt+drag Resize Fix
- `useBlockResize.ts` missing viewport scale division (sibling parity with `useBlockDrag.ts`)
- Fixed 4 CSS `var(--text-scale)` missing `, 1` fallback
- **Files:** `src/hooks/useBlockResize.ts`, `src/workspace.css`

### Lane 4: Pin Blocks to Corner HUD
- New `PinnedHUD.tsx` — fixed bottom-right overlay, collapsed header-only blocks
- Drag-to-reorder with 44px slot calculation
- Pin/Unpin button in BlockShell actions
- CSS overrides for flex layout in HUD context
- **Files:** `src/components/PinnedHUD.tsx` (new), `src/blocks/BlockShell.tsx`, `src/components/Canvas.tsx`, `src/workspace.css`, `src/types.ts`

### Lane 5: OBS-Style Seamless Source Switching
- `switchSource()` function: replaces video tracks on live MediaStream without stopping MediaRecorder
- `pickSource()` routes to seamless switch when streaming, full restart when not
- Camera↔Screen mode toggles work during recording
- Source picker categorized: Camera section + Screen/Window section
- **Files:** `src/blocks/VideoCaptureBlock.tsx`

### Lane 6: YouTube Studio Block
- New `YouTubeStudioBlock.tsx` — iframe embed with editable URL bar
- X-Frame-Options detection via onLoad/contentDocument check
- "Open in Browser" fallback
- Registered in BlockRegistry (900×600), blockIcons (Play icon)
- **Files:** `src/blocks/YouTubeStudioBlock.tsx` (new), `src/blocks/BlockRegistry.ts`, `src/utils/blockIcons.ts`, `src/types.ts`

### Bonus: Beta/Stable Channel + Update Flow
- Non-disruptive update flow in GearMenu
- **Files:** `src/components/GearMenu.tsx`, `package.json`, `electron-builder.yml`

---

## What Shipped
- 15 commits, all pushed to `origin/main`
- 15 files changed, ~593 lines added
- 2 new block components (PinnedHUD, YouTubeStudioBlock)
- Build: 1792 modules, 0 TypeScript errors

## Key Decisions
- OBS-style switching uses `removeTrack`/`addTrack` on live MediaStream — MediaRecorder never stops
- Audio is NOT re-mixed during source switch (intentional: re-creating AudioContext would break recording)
- YouTube Studio block is iframe-based with graceful fallback for X-Frame-Options

## Lessons Locked
- 3 new prevention rules: JW-35 (Sibling-Code Parity), JW-36 (Plan-Before-Build Gate), JW-37 (Hidden Media Elements)
- JW-33 amended to require `var(--text-scale, 1)` fallbacks in CSS files
- See `history/lessons/2026-04-04-lessons-locked.md`

### Lane 7: Space Text Input Fix (Session 2)
- `isTextInputFocused()` guard added to Canvas.tsx space pan handler
- Typing space in journal/content/any block input restored
- JW-39 added (Input-Focus Guard Before Global Key Hijacking)
- **Files:** `src/components/Canvas.tsx`

### Lane 8: YouTube Studio API Integration (Session 3)
- Replaced iframe stub with YouTube Live Streaming API v3 dashboard
- Google OAuth2 flow via Electron BrowserWindow (auth code exchange in main process)
- Token management: localStorage storage, auto-refresh via IPC
- Dashboard UI: broadcast status pill, viewer count, stream health, Go Live / End Stream buttons
- 30s auto-poll with cleanup (JW-28)
- **Files:** `electron/main.cjs`, `electron/preload.cjs`, `src/types.ts`, `src/utils/youtubeApi.ts` (new), `src/blocks/YouTubeStudioBlock.tsx` (rewrite)

---

## What Shipped (Updated — All Sessions)
- 20+ commits across 8 lanes, all pushed to `origin/main`
- 1793 modules, 0 TypeScript errors
- New files: `PinnedHUD.tsx`, `youtubeApi.ts`; rewritten: `YouTubeStudioBlock.tsx`

## Pending / Next
- User testing: YouTube Studio OAuth flow, seamless source switching, PinnedHUD
- DMG rebuild: `npm run electron:build:mac`
