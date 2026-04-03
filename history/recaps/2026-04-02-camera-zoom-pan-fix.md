# Session Recap — 2026-04-02: Camera Zoom Anchor + Pan Wall Fix

Requested by: User
Executed by: Claude Code
Wrap-up written by: Claude Code

## What Was Worked On

User reported two camera bugs:
1. Zoom (scroll wheel) doesn't anchor to mouse cursor — view shifts instead of staying centered on cursor
2. At ~45% zoom, panning (Space+drag) hits an invisible wall

## Root Causes Found

**Bug 1 — Zoom anchor:** `zoomTo()` correctly computes viewport position to keep the board-point under the cursor stationary, but `applyViewportTransform()` unconditionally calls `clampViewport()`, which shifts the viewport back into bounds, breaking the anchor — especially near board edges.

**Bug 2 — Pan wall:** `getViewportBounds()` uses fixed board-space padding (2400px). At lower zoom levels, this shrinks in screen-space (at 45%: only 1080 screen-px of overscroll). Users hit the clamp boundary sooner.

## What Shipped

3 surgical edits to `workspace.html`:

1. **Scale-aware padding** (line 3408): `VIEWPORT_PADDING / s` instead of fixed `VIEWPORT_PADDING`. Keeps overscroll constant in screen-space at any zoom level.
2. **Conditional clamp** (lines 3427-3428): `applyViewportTransform(options)` with `skipClamp` flag. Existing callers unchanged.
3. **Skip clamp during zoom** (line 3455): `zoomTo()` passes `{ skipClamp: true }` so cursor-anchor math isn't destroyed by clamping.

## Files Changed

- `workspace.html` — 3 edits in camera math functions (`getViewportBounds`, `applyViewportTransform`, `zoomTo`)

## Key Decisions

- Skip clamp during zoom, let next pan operation gently re-clamp if needed (standard canvas app behavior)
- Scale-aware padding: `pad = VIEWPORT_PADDING / scale` ensures consistent screen-space overscroll regardless of zoom level

## Still Pending

- Browser smoke testing to confirm both fixes (JW-16)
