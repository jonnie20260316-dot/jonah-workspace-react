# Session Recap: Spotify Block — Persistent Login (Final Iteration)

**Date:** 2026-04-08 (late evening)  
**Requested by:** User  
**Executed by:** Claude Code  
**Wrap-up written by:** Claude Code

---

## Summary

Implemented Spotify block persistent login with environment-aware rendering:
- **Electron:** Webview with `persist:spotify` session (persistent login across app restarts)
- **Browser:** Preset tabs that open Spotify in new tabs (no embed constraints)

---

## Iterations & Learning

### Iteration 1: Webview-Only Approach
- Switched from iframe embeds to Electron webview with persistent session partition
- 3 files changed, build passed
- **User feedback:** "the fucking container is still shrinked"
- **Issue:** User was testing in browser mode (`npm run dev`), not Electron. Webview doesn't work in browsers.

### Iteration 2: Full-Screen Modal
- Added portal-based full-screen overlay with embedded Spotify player
- Thought bigger modal would solve "shrinked" complaint
- **Result:** Spotify embed widgets are inherently small (designed as compact players, not full-page apps)
- Modal didn't help — embed content itself couldn't scale

### Iteration 3: Environment-Aware Rendering (Final)
- **Electron:** Keep webview (works great, persistent session)
- **Browser:** Remove embed iframe, add preset tabs that open `open.spotify.com` in new tabs
- Cleaner, simpler, actually solves the problem
- User no longer constrained by tiny embeds

---

## Lessons Locked

**LESSON-SPOTIFY-1: Clarify Environment Before Shipping**
- **Root cause:** Didn't ask upfront whether user was testing in Electron or browser
- **Related rule:** JW-9 (Clarify Before Diagnosing)
- **Prevention:** When implementing Electron-specific features, confirm target environment before design. Test in actual environment, not just build check.

**LESSON-SPOTIFY-2: Understand Widget Constraints**
- **Root cause:** Assumed Spotify embed could be made bigger in a modal. Didn't test that the embed content itself is a small fixed-size widget.
- **Related rule:** JW-16 (Visual Verification Gate)
- **Prevention:** Open the app and visually confirm the output renders as intended before marking done. Build passing ≠ feature working.

---

## Files Changed (Final)

1. **`src/blocks/SpotifyBlock.tsx`**
   - Removed full-screen modal + createPortal approach
   - Added `isElectron` check
   - Browser: clicking preset opens `open.spotify.com` in new tab
   - Electron: webview with persistent session (unchanged)

2. **`src/blocks/BlockRegistry.ts`** (already committed)
   - Added `keepMounted: true` to spotify entry

3. **`electron/main.cjs`** (already committed)
   - Created `persist:spotify` session with Chrome UA spoof

---

## Verification

- ✅ Build passes (Spotify changes clean; VideoCaptureBlock.tsx has pre-existing errors, not addressed per user request)
- ✅ Electron mode: webview loads, persistent login works
- ✅ Browser mode: preset tabs + click to open new tab works
- ⚠️ VideoCaptureBlock.tsx: Broken state with TypeScript errors (pre-existing, out of scope)

---

## Durable Changes

**Feature completed and live:**
- Spotify block dual-mode support (Electron webview + browser new-tab)
- Persistent login in Electron via `persist:spotify` partition
- Preset system works in both modes

---

## Prevention Rules Added

1. **CLARIFY-ENVIRONMENT-FIRST:** Before implementing Electron-specific features, ask whether user is testing in Electron or browser. Affects design and viability.
2. **VISUAL-VERIFY-BEFORE-DONE:** Open the app and look. Build passing doesn't mean UI works. Embed widgets, modals, and custom elements need eyes-on verification.

---

## Notes

- The web app version can't embed the full Spotify experience (X-Frame-Options blocks `open.spotify.com` in iframes)
- Spotify embed URLs are specifically designed for embedding but are small widgets, not full players
- New-tab approach is simple, reliable, gives users the full Spotify experience
- No API credentials needed (uses Spotify's public web interface)
