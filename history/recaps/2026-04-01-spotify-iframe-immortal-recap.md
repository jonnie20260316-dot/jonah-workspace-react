# Session Recap — 2026-04-01: Spotify Iframe Immortal

**Requested by:** User
**Executed by:** Claude Code (Sonnet 4.6)
**Wrap-up written by:** Claude Code (Haiku 4.5)

## What Was Worked On

Single bug fix lane: Spotify iframe reloading on every in-app event that triggers a DOM rebuild. The user wanted zero music interruptions from any app action.

## Failure Modes Diagnosed

| Trigger | Path | Root Cause |
|---|---|---|
| Undo (還原) | `renderBoard()` | iframe fully detached from live document |
| Window resize | `renderBoard()` | same |
| Date change | `renderBoard()` | same |
| Compact toggle | `rerenderBlock()` | innerHTML replacement destroys iframe |

## Root Cause

Cross-origin iframes (Spotify at `open.spotify.com`) reload when **removed from the live document** and reinserted. The existing `renderBoard()` preservation code called `iframe.remove()` (full detach) before clearing the board — even though the iframe was later reinserted, some browsers (Safari on macOS) treat the detach as a navigation and reload.

For `rerenderBlock()`, there was no preservation at all — `article.innerHTML = blockMarkup(block)` simply destroyed the iframe in-place.

## Fix Shipped

### Fix 1 — `renderBoard()` (lines ~5007–5042)

Replaced `iframe.remove()` with `iframeStash.appendChild(iframe)` where `iframeStash` is a hidden `<div>` appended to `document.body`. The iframe moves boardCanvas → stash → new article, staying inside the live document throughout. `document.body.removeChild(iframeStash)` cleans up after the forEach loop.

### Fix 2 — `rerenderBlock()` (lines ~5058–5078)

Added a Spotify-specific guard before the generic `innerHTML` replacement:
- If active URL is unchanged (compact toggle, label-only edits): stash iframe → rebuild innerHTML → restore iframe
- If URL changed (preset switch): fall through to normal re-render (intentional reload)

## What Is Still Pending

- Page refresh (Cmd+R): browser-level limitation, cannot be solved with DOM manipulation. Best effort would be `autoplay=1` in embed URL, but browser autoplay policies block this.

## New Prevention Rule

**JW-22: Iframe Document Continuity** — when preserving a cross-origin iframe across a DOM rebuild, move it to an in-document stash element instead of calling `iframe.remove()`. Fully removing from the document destroys the browsing context; parent-to-parent moves within the live document do not.

## Status

✅ **Shipped.** Two targeted edits to `workspace.html`. No new files. No regressions expected (same logic, just no detach).

---
**Model:** Sonnet 4.6 (planning + implementation), Haiku 4.5 (wrap-up)
**Effort:** Clean path — root cause found in exploration phase, fix was ~20 lines total
