# Session Recap — 2026-04-08 (Late Evening)

Requested by: User
Executed by: Claude Code
Wrap-up written by: Claude Code

---

## What Was Worked On

Two streaming bugs fixed: (1) collapsed/pinned blocks keep streaming in background, (2) PiP never reappears after source switch.

### Lane 1: Collapse/Pin Stops Streaming

**Problem:** VideoCaptureBlock and YouTubeStudioBlock both use `keepMounted: true`. When collapsed or pinned, React component stays mounted, unmount cleanup never fires, streams keep running (webcam light on, RTMP still sending to YouTube).

**Root cause:** No observer on `block.collapsed` or `block.pinned` to trigger stream stop.

**Fix (`src/blocks/VideoCaptureBlock.tsx` + `src/blocks/YouTubeStudioBlock.tsx`):**
- Added `useEffect` watching `[block.collapsed, block.pinned, stopStream]` 
- Calls `stopStream()` / `stopRtmpStream()` immediately when either flag becomes true
- Both stop functions are internally guarded (safe to call when idle)

**Result:** Collapsing or pinning now stops:
- VideoCaptureBlock: camera/screen recording stream (tracks stopped, audio context closed)
- YouTubeStudioBlock: RTMP broadcast stream (MediaRecorder stopped, FFmpeg process terminated)

---

### Lane 2: PiP Never Reappears After Source Switch

**Problem:** User enables PiP in screen capture mode, switches camera source, PiP overlay never comes back. User must restart entire stream to regain PiP.

**Root cause (two bugs):**
1. **"ended" event listener** in `startPipCamera` called `setPipEnabled(false)` on every source switch:
   - `stopPipCamera()` calls `.stop()` on camera track → fires "ended" event → listener calls `setPipEnabled(false)` → writes `false` to localStorage
   - This disabled PiP *permanently* across all future sessions until manually re-enabled

2. **Catch block** in `startPipCamera` also called `setPipEnabled(false)` on any `getUserMedia` error (e.g., camera briefly busy during switch)

**Fix (`src/blocks/VideoCaptureBlock.tsx`):**
- **Change A (already applied):** Removed `setPipEnabled(false)` from "ended" event handler (line 287)
  - Camera disconnect still stops PiP overlay via `stopPipCamera()`
  - But toggle stays ON in localStorage so it auto-restarts on next source switch
  
- **Change B:** Removed `setPipEnabled(false)` from catch block (line 301)
  - Transient camera errors no longer permanently disable PiP toggle

- **Change D:** Removed `setPipEnabled` from `startPipCamera` deps array (line 303)
  - Dependency no longer needed after removing setPipEnabled calls

**Result:** When user switches source with PiP enabled:
- `stopPipCamera()` runs → clears overlay only
- `pipEnabled` stays `true` in localStorage
- Auto-manage useEffect sees `pipEnabled=true` + `isStreaming=true` + `captureMode=screen` → calls `startPipCamera()` again
- New PiP stream starts automatically, overlay reappears without user toggling anything

---

## What Shipped

| File | Change |
|------|--------|
| `src/blocks/VideoCaptureBlock.tsx` | Removed `setPipEnabled(false)` from catch block; Removed `setPipEnabled` from deps; Added collapse/pin → `stopStream()` useEffect |
| `src/blocks/YouTubeStudioBlock.tsx` | Added collapse/pin → `stopRtmpStream()` useEffect |

**Build:** ✓ 1820 modules, 0 TypeScript errors

---

## Verification Checklist (For User)

- [ ] Start camera stream → pin block → camera stops (webcam light off)
- [ ] Start YT RTMP stream → collapse block → FFmpeg stops
- [ ] Enable PiP in screen mode → switch sources → PiP overlay reappears without toggling
- [ ] Enable PiP → switch sources several times → PiP toggle stays ON in UI
- [ ] Reload app → PiP toggle still ON (localStorage not wiped)

---

## Key Decisions

- Used existing `stopStream()` and `stopRtmpStream()` utilities — no new functions needed
- `useEffect` deps include both `block.collapsed` AND `block.pinned` since pinning also implies collapse in the UI
- Both stop functions are safe to call when idle (guarded internally) so no extra state checks needed
