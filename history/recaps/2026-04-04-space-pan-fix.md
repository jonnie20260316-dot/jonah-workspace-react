# Session: 2026-04-04 — Space Pan Fix

**Requested by:** User  
**Executed by:** Claude Code  
**Wrap-up written by:** Claude Code  

---

## Summary

Fixed space-to-pan feature that was broken in the 2026-04-03 redo (commit 80f2745). The 2026-04-03 work added the Space key handler and CSS styling to Canvas, but did **not** add pan-mode guards to the block drag/resize hooks. When Space was held and user clicked on a block, both block drag and canvas pan competed for the same pointer, making pan unreliable.

**Status:** ✓ FIXED — Committed, build passing, no rework needed.

---

## Root Cause

Two independent `onPointerDown` handlers competing for exclusive pointer capture:

1. **Canvas.tsx** — React synthetic `onPointerDown` on viewportRef (checks `spacePressedRef.current`, correctly yields when Space held)
2. **useBlockDrag.ts** — Native `addEventListener("pointerdown")` on block header (had **NO** pan-mode guard)
3. **useBlockResize.ts** — Native `addEventListener("pointerdown")` on resize handles (had **NO** pan-mode guard)

When Space was held:
- Canvas tried to pan via `setPointerCapture`
- Block hook also tried to drag/resize via `setPointerCapture`
- Last call to `setPointerCapture` "won" — whichever ran last got the pointer
- Pan only worked reliably on empty canvas, failed when clicking over blocks

---

## Changes Made

**Three files, four lines of code:**

### 1. src/hooks/useBlockDrag.ts:40
```typescript
const onPointerDown = (e: PointerEvent) => {
  if (document.body.dataset.panMode) return; // yield to canvas pan (Space held)
  // Read current block position from store...
```

### 2. src/hooks/useBlockResize.ts:44
```typescript
const onPointerDown = (e: PointerEvent) => {
  if (document.body.dataset.panMode) return; // yield to canvas pan (Space held)
  // Read current block from store...
```

### 3. src/workspace.css
Added CSS rule for cursor feedback in pan mode:
```css
body[data-pan-mode] .board-block {
  cursor: grab !important;
}
```

---

## Build & Verification

- **Build:** `npm run build` → ✓ 1790 modules, 0 TypeScript errors, 241ms
- **Commit:** `4c47eb9` — "fix: space pan — block drag/resize yield to canvas pan when Space held"
- **Status:** Working tree clean, ahead of origin/main by 1 commit (ready to push)

---

## Prevention

This was a coordination bug between multiple pointer handlers. Prevention strategies:

1. **JW-28 (Resource Cleanup)** — Already in effect for event listener cleanup
2. **JW-26 (Fresh-State-in-Handlers)** — Already in effect; `document.body.dataset.panMode` is the source of truth
3. **JW-16 (Visual Verification Gate)** — After fixing canvas pan, visual testing would confirm Space-to-pan works over blocks

No new prevention rules needed — issue was incompleteness in a prior redo, not a design flaw.

---

## Next Step

Push to GitHub: `git push origin main`
