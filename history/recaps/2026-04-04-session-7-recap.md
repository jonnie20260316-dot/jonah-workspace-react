# Session Recap — 2026-04-04 (Session 7)

Requested by: User
Executed by: Claude Code
Wrap-up written by: Claude Code

---

## What Was Worked On

**Video Source Switch Bug** — two regressions in `VideoCaptureBlock.tsx` when users clicked the source toggle (camera ↔ screen capture):

1. Preview freezes on the last frame (video doesn't update to show new source)
2. Screen capture video goes completely black after switching

---

## What Shipped

**Fixed in `src/blocks/VideoCaptureBlock.tsx` — `switchSource()` callback (1 file, +8 lines)**

Root cause: `switchSource()` reassigned `srcObject` on video elements but never called `.play()` afterward, unlike `startStream()` and `startScreenStream()` which both call `.play()` explicitly.

**When `srcObject` is replaced on a `<video>` element, the browser pauses playback. Without explicit `.play()` call, the pause persists → frozen frame or black.**

### The 4 Fixes

1. **`videoRef.play()`** after `srcObject = streamRef` — unfreezes the main preview
2. **`screenVideoRef.play()`** after `srcObject = newStream` — unfreezes the hidden screen compositing video
3. **`screenVideoRef.srcObject = null`** on camera switch — clears the stale stopped screen-capture track
4. **`useStreamStore.setActiveStream(streamRef.current)`** after track swap — keeps YouTube Studio block in sync with the new stream

**Verification:**
- `npm run build` ✓ (1794 modules, 0 errors)
- Commit: `003ee10`
- Pushed to origin/main

---

## What Learned / Prevention Rule

**New Prevention Rule: `VIDEO-SRCOBJECT-1` (HIGH)**

**Rule:** When reassigning `srcObject` on a `<video>` element, **always call `.play()` immediately after.**

**Why:** Browser pauses video when `srcObject` changes. Without explicit `.play()`, the element stays paused forever, even though the new stream is valid and playing in the browser's internal state.

**Applies to:**
- Media streaming (video capture, screen share, live broadcast)
- Any UI that swaps video sources mid-playback
- Hidden video elements used for canvas compositing or recording

**Checklist:**
- [ ] Reassign `srcObject` to new stream
- [ ] Call `.play()` immediately (same statement block or immediately after)
- [ ] Wrap `.play()` in `.catch()` to avoid unhandled rejection if browser denies autoplay
- [ ] If no `.play()` needed initially (element not visible), comment why

**Pattern:**
```typescript
videoRef.current.srcObject = newStream;
videoRef.current.play().catch(err => console.warn("Play failed:", err));
```

**Related:**
- JW-28 (Resource Cleanup on Unmount) — cleanup `.play()` promises if component unmounts
- JW-38 (Hidden Media Must Stay in Layout) — hidden video elements need proper lifecycle

---

## Still Pending

None. Bug fully fixed and pushed.

---

## Key Decisions

- Single-file fix (no refactor needed)
- Used `.catch()` pattern for `.play()` to avoid console spam if browser denies autoplay
- Updated store to keep downstream blocks in sync (YouTube Studio block)
