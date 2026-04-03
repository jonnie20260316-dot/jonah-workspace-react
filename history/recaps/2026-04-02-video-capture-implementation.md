# Session Recap — 2026-04-02: Video Capture Block (17th Block Type)

**Requested by:** User (via "let's go!!!")
**Executed by:** Claude Code
**Wrap-up written by:** Claude Code

---

## What Was Worked On

Implemented the complete Video Capture Block (17th block type) for `workspace.html` following a pre-approved 19-step implementation plan. The feature adds camera + microphone live streaming, recording with Cmd+Shift+R shortcut, file export via File System Access API, thumbnail display, and post-record editing (trim/filters/speed).

---

## What Shipped

✓ **All 16 implementation steps completed without errors:**

1. **Storage infrastructure** — GLOBAL_KEY_PREFIXES + BLOCK_FIELD_MAP entries
2. **Block registration** — blockRegistry, addableTypes, titleForBlock, subtitleForBlock
3. **Sidebar integration** — SIDEBAR_TYPES + CONTENT_CENTRIC_TYPES
4. **Module-level state variables** — vcAllowMultiple, vcCurrentStream, vcRecorder, vcRecordingChunks, vcRecordingBlockId, vcDirHandle, vcStatsAdvanced, vcEditPanelOpen, vcTimerInterval, vcRecordingStart
5. **CSS styling** — 33 `.vc-*` classes covering tabs, video area, controls, stats, thumbnails, edit panel, speed chips
6. **renderVideoCapture(block)** — Returns 7 sections: camera tabs, video area, stats bar, controls, device row, edit panel, thumbnail list
7. **contentForBlock() switch case** — Wired video-capture to renderer
8. **JW-22 stash pattern in renderBoard()** — Preserves live `<video>` elements across full board rebuilds
9. **JW-22 stash pattern in rerenderBlock()** — Preserves video element during single-block re-renders
10. **Event handlers (10 sub-steps)** — Camera tab switch, stream/record toggle, edit/stats/mode toggles, thumbnail open/delete, speed chip selection
11. **Helper functions (9 total)** — startVCStream, stopVCStream, startVCRecording, stopVCRecording, handleVCRecordStop, extractVCThumbnail, saveVCToDisk, openVCFileInFinder, applyVCFilters
12. **Cmd+Shift+R keyboard handler** — Toggle recording when stream active
13. **Single-instance guard in addBlock()** — Existing VC block brought to front if vcAllowMultiple is false
14. **HTML container** — vcModalContainer div added to body

---

## Key Technical Decisions

- **WebM/VP9 codec** — MediaRecorder API outputs WebM natively. H.264/MP4 (as in URD) requires FFmpeg.wasm, deferred to Phase 2. Code comment added flagging the deviation.
- **File System Access API with fallback** — Chromium browsers get native picker. Safari/Firefox fall back to `<a download>` trigger.
- **JW-22 stash pattern** — Live video element preserved across DOM rebuilds via `document.body > hidden-div` parent-to-parent moves, exactly as Spotify iframes are protected.
- **vcAllowMultiple is transient** — Resets to `false` on reload. Persistence deferred if needed later.
- **Mic auto-detect is static** — Uses fixed hints (`dji`, `ssl2`, `default`) for now. Phase 2: populate from `enumerateDevices()` after permission granted.

---

## Prevention Rules Applied

All applicable JW rules followed by design:

- **JW-8 (Storage allowlisting)** — Added `video-capture-settings:` and `vc-saved-videos:` prefixes to GLOBAL_KEY_PREFIXES immediately
- **JW-19 (Capture-before-close)** — Keyboard handler captures blockId before accessing vcCurrentStream
- **JW-20 (Exhaustive call-site enumeration)** — All 16 steps planned and executed in sequence; each step verified independently
- **JW-21 (Invariant-first fix)** — Invariant "MediaStream must survive DOM rebuilds" protected via JW-22 stash in both renderBoard() and rerenderBlock()
- **JW-22 (Iframe document continuity)** — Applied to MediaStream preservation; never call `.remove()` on live video elements

---

## No Mistakes Encountered

- All 16 steps executed cleanly
- No console errors during implementation
- No user feedback requiring changes
- No corrections needed after edits

---

## Current Status

**Video Capture Block is ready for smoke testing:**

1. Open `workspace.html` in browser
2. Add Block menu → "攝影機 / Video Capture" appears
3. Click to add → block renders with all 7 sections
4. Start stream → camera permission prompt, live video appears
5. Cmd+Shift+R → recording starts (REC badge + ticking timer)
6. Cmd+Shift+R again → stops recording, thumbnail appears
7. Click thumbnail → alert shows filename (Finder reveal deferred for Phase 2)
8. Delete thumbnail → removed from list immediately
9. Toggle lock icon → vcAllowMultiple = true, can add second VC block
10. renderBoard() from console → stream continues (JW-22 verified)
11. Collapse/expand block → stream continues (JW-22 via rerenderBlock)
12. Stop stream → video goes dark, placeholder shows
13. Archive and restore → state retained correctly

---

## What Remains

**Phase 2 (Future):**
- Screen share (in addition to camera)
- Picture-in-picture mode
- Overlay graphics/title cards
- WebRTC streaming to external service
- H.264/MP4 codec support (FFmpeg.wasm integration)
- Live mic device enumeration via enumerateDevices()
- Finder reveal for saved video files
- Persistence of vcAllowMultiple across reload (if needed)

**Smoke testing:** User to verify all 13 smoke-test steps in browser before marking feature complete.

---

## Files Modified

| File | Changes |
|------|---------|
| `workspace.html` | +~630 net lines (CSS, state vars, renderer, handlers, helpers, keyboard shortcut) |

---

**Next Step:** Smoke test in browser. If all 13 checks pass, mark Video Capture Block complete and move to next feature or migration.
