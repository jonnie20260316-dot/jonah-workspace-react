# Lessons Locked — 2026-04-04 (Session 7)

## Mistakes Extracted

### Mistake 1: Missing `.play()` After `srcObject` Reassignment

**Where:** `src/blocks/VideoCaptureBlock.tsx`, lines 572–574 (main video element), lines 542–544 (screen compositing video)

**What went wrong:**
```typescript
// BEFORE (broken)
if (videoRef.current) {
  videoRef.current.srcObject = streamRef.current;
  // No .play() — browser paused silently
}
```

**Symptom:** User clicks "switch source" → preview freezes on last frame, looks like UI is broken

**Impact:** Regression in core feature (seamless source switching claimed in memory, but broken in UI)

---

### Mistake 2: screenVideoRef Not Updated When Switching to Camera

**Where:** `src/blocks/VideoCaptureBlock.tsx`, lines 549–560 (camera mode path)

**What went wrong:** When switching FROM screen TO camera, the code acquires a camera track but never clears or updates `screenVideoRef.srcObject`. It still points to the old, stopped screen-capture track.

**Symptom:** Any canvas compositing that reads `screenVideoRef` (e.g., PiP mode, mixing) gets a black frame from the defunct track

**Impact:** Black screen artifact; PiP mixing broken on camera→screen→camera cycle

---

### Mistake 3: useStreamStore Not Updated After Track Swap

**Where:** `src/blocks/VideoCaptureBlock.tsx`, line 568 (after `streamRef.addTrack()`)

**What went wrong:** `startStream()` and `startScreenStream()` both call `useStreamStore.getState().setActiveStream(...)` to notify downstream blocks (e.g., YouTubeStudioBlock) of the new stream. `switchSource()` updated `streamRef.current` but never called `setActiveStream()`.

**Symptom:** YouTube Studio block continues to record from the OLD stream; source switch happens in preview but recording stream is stale

**Impact:** Silent data corruption: user sees camera on screen, but YouTube receives screen capture (or vice versa)

---

## Root Causes

### RC-1: Incomplete Pattern Replication

**Type:** Process gap — copy-pasted logic without full understanding

When `switchSource()` was implemented as an OBS-style optimization (track swap instead of full stream restart), the author copied the `srcObject = ...` pattern from `startStream()` and `startScreenStream()` but **did not copy the `.play()` call**, likely seeing it as "initialization" logic rather than "every time srcObject changes" logic.

**Lesson:** When copying a sequence of steps (A → B → C), always copy all steps. If you're unsure why a step exists, ask first or test without it.

---

### RC-2: Multiple Video Elements, Partial Synchronization

**Type:** Design gap — state duplication across refs

The component manages three video elements (main preview, screen compositing, pip camera) but doesn't have a unified "update source" path. Each element is updated separately, creating three separate bug-prone sites. When switching sources, only the main preview needs to update, but the screen compositing video also needs updating.

**Lesson:** Centralize state updates. Consider a helper like:
```typescript
const updateVideoTrack = (role: "preview" | "screen" | "pip", track: MediaStreamTrack) => {
  // all updates go through here
};
```

---

### RC-3: Missing Store Synchronization Check

**Type:** Verification gap — didn't test downstream consumers

The bug only manifested with YouTube Studio block open, because that's the only downstream consumer of `useStreamStore`. If the developer had tested with YouTube Studio open during source switch, the stale stream would have been obvious.

**Lesson:** When a store is updated in one place, grep for all readers and test with at least one reader active.

---

## Prevention Rules

### VIDEO-SRCOBJECT-1 (NEW, HIGH)

**Scope:** All video-media work in this codebase and similar streaming UIs

**Rule:**
When reassigning `srcObject` on a `<video>` element, **always call `.play()` immediately after**, even if the element has `autoPlay` attribute.

**Why:** Browser pauses when `srcObject` changes. Without explicit `.play()`, pause persists silently.

**Checklist:**
- [ ] Identify all lines that do `videoRef.srcObject = ...` or `someVideo.srcObject = ...`
- [ ] For each, verify the next line calls `.play().catch(...)`
- [ ] If you're unsure whether a video needs playback, test by removing `.play()` in dev and observe

**Pattern:**
```typescript
videoRef.current.srcObject = newStream;
videoRef.current.play().catch(err => console.warn("Play failed:", err));
```

**Related rules:**
- JW-28 (Resource Cleanup) — cleanup listeners and promises on unmount
- JW-38 (Hidden Media in Layout) — don't hide video elements with `display: none`

---

### STORE-SYNC-1 (NEW, MEDIUM)

**Scope:** Any component that reads from Zustand stores and modifies shared state

**Rule:**
When state changes in a component (e.g., stream, MediaStream, config), **always call the corresponding store action to update downstream readers**, not just the local ref.

**Why:** Refs and stores can get out of sync. Downstream blocks may be reading stale handles. Developers won't discover this without testing with those blocks visible.

**Checklist:**
- [ ] Identify the store (e.g., `useStreamStore`, `useBlockStore`)
- [ ] Find all places you mutate shared state (e.g., `streamRef.current = ...`)
- [ ] For each mutation, call the store setter (e.g., `useStreamStore.getState().setActiveStream(...)`)
- [ ] grep for all readers of that store key (e.g., `useStreamStore(s => s.activeStream)`)
- [ ] Test with at least one reader visible while you change the state

---

### PATTERN-COPY-CHECKLIST (NEW, MEDIUM)

**Scope:** Code review and refactoring

**Rule:**
When copying a code pattern (e.g., "starting a stream", "switching to new device"), copy **all steps**, not just the core logic. If you skip a step, document why.

**Why:** Patterns often have side effects (resource cleanup, store sync, UI updates) that are easy to miss on second read.

**Checklist:**
- [ ] Identify the source pattern (e.g., `startStream()` function)
- [ ] List all statements in order:
  - Get user media
  - Assign to ref
  - Call `.play()`
  - Call store action
  - Set UI state
  - Add listeners
- [ ] Apply the same list to your new location
- [ ] If you omit a step, add a comment explaining why (e.g., "skip .play() because element is hidden until later")

---

## Integration Points

1. **Add VIDEO-SRCOBJECT-1 to MEMORY.md Prevention Rules table** — HIGH severity, applies to all video-media work

2. **Add STORE-SYNC-1 to MEMORY.md** — affects any component managing shared state

3. **Grep for other `srcObject` assignments** in the codebase to ensure they all have `.play()`:
   - `src/blocks/VideoCaptureBlock.tsx` (fixed)
   - `src/components/Canvas.tsx` (if any)
   - `src/hooks/` (if any)

4. **Add a note to CLAUDE.md about srcObject pattern** — could be under a new "Media Streaming" section

---

## Summary

This session fixed a regression in the seamless source-switching feature. The bugs were not in the design, but in **incomplete implementation**—the developer copied the srcObject pattern but forgot the `.play()` call that must follow. The lesson is worth codifying as a high-severity rule, because video/media work tends to repeat in production apps, and this pattern will reappear.

**Files touched:** 1 (`src/blocks/VideoCaptureBlock.tsx`)  
**Lines changed:** +8  
**Build:** ✓ 1794 modules, 0 errors  
**Commit:** `003ee10`
