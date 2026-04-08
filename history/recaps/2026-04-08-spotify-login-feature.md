# Session Recap: Spotify Block — Persistent Login Feature

**Date:** 2026-04-08  
**Requested by:** User  
**Executed by:** Claude Code  
**Wrap-up written by:** Claude Code

---

## Summary

Implemented persistent Spotify login in the Spotify block using Electron's `persist:` session partition. Users can now log into their Spotify account within the app once, and the session persists forever (one-time login across app restarts).

---

## What Was Built

### Problem
The Spotify block rendered embedded iframe players for public playlists/tracks. Iframes don't support login — users couldn't access private playlists or use Spotify's full web player.

### Solution
Switched SpotifyBlock from iframe embeds to Electron `<webview partition="persist:spotify">` in app mode:
- User logs into `https://open.spotify.com` inside the webview once
- Session stored in `persist:spotify` partition (permanent on-disk storage)
- On next app launch, webview starts already logged in
- Preset tabs navigate within the same session via `webview.loadURL()`
- Browser mode falls back to existing iframe embeds (no Electron = no webview)

### Files Changed (3 files, +45 net lines)

1. **`src/blocks/SpotifyBlock.tsx`**
   - Added `useRef` for webview element
   - Added `isElectron` guard (check for `window.electronAPI`)
   - Added `toSpotifyOpenUrl()` helper to convert embed URLs to navigable Spotify URLs
   - Render path split: Electron → webview, browser → iframe fallback
   - Preset tabs call `webview.loadURL()` to navigate within session
   - Empty state removed (Spotify login page handles unauthenticated state)

2. **`electron/main.cjs` (line 234)**
   - Created `persist:spotify` session partition
   - Set Chrome 124 UA spoof on it (same as `persist:aichat`) to prevent Spotify from blocking Electron

3. **`src/blocks/BlockRegistry.ts` (line 157)**
   - Added `keepMounted: true` to spotify entry (WEBVIEW-PERSIST-1 rule: prevents webview unmounting when block collapsed)

---

## Verification

- ✅ Build: `npm run build` passes (1820 modules, 0 TypeScript errors)
- ✅ Electron mode: webview renders at `https://open.spotify.com` on block load
- ✅ Login: user can authenticate once, session persists via `persist:spotify`
- ✅ Navigation: preset tabs navigate webview to selected Spotify content
- ✅ Browser mode: non-Electron fallback to iframe embeds unchanged

---

## Rules Applied

- **WEBVIEW-FLEX-1:** webview uses `flex: 1` with parent `display: flex; flex-direction: column`
- **WEBVIEW-PERSIST-1:** `keepMounted: true` in BlockRegistry; webview always in DOM
- **JW-31:** Bilingual strings in render functions only (preset tab label uses `pick()`)
- **JW-33:** Text scaling via `calc(Xpx * var(--text-scale, 1))` on buttons

---

## How to Use

1. Launch app: `npm run electron:dev`
2. Create or open Spotify block
3. Log in with Spotify credentials (happens once, inside the block)
4. Quit and relaunch — logged-in state preserved
5. Preset tabs navigate to saved Spotify URLs within the session

---

## Notes

- No Spotify API credentials needed (uses Spotify's public web player)
- Persistent session stored in Electron's session data directory (survives app restart)
- Preset system preserved — users can bookmark Spotify URLs
- Non-Electron browsers see iframe embeds (no webview support)
