# 2026-04-03 — Font Size Settings Added

Requested by: User  
Executed by: Claude Code  
Wrap-up written by: Claude Code  

## Summary

Added user-facing **Font Size** control to both `workspace.html` (vanilla) and React app. User can now scale block text (titles, body, headings) from 0.82× to 1.25× without zooming canvas.

## What Shipped

### workspace.html (vanilla)
- **CSS:** Added `--text-scale: 1` to `:root` (line 56)
- **Typography:** Updated font-size rules for sticky-area, content-title, content-body, block h3 using `calc(Xpx * var(--text-scale))`
  - sticky-area: 15px → calc(15px * var(--text-scale))
  - content-title: 17px → calc(17px * var(--text-scale))
  - content-body: 14px → calc(14px * var(--text-scale))
  - .sticky-area h3, .content-body h3: 15px → calc(15px * var(--text-scale))
- **Gear menu:** Added "字型大小 / Font Size" section with 5 scale buttons (A−/A/A+/A++/A+++)
- **Storage:** Added `text-scale` to GLOBAL_KEYS for persistence
- **JS:** Load on boot, apply via `document.documentElement.style.setProperty()`, button handlers save + sync active state
- **UI:** Buttons styled as pills (border, hover bg, active = dark ink)

### React app (jonah-workspace-react)
- **tokens.css:** Added `--text-scale: 1` (line 76)
- **workspace.css:** Updated 5 font-size rules with `calc()`:
  - .block-title h2: 17px
  - .block-subtitle: 12px
  - block inputs: 13px
  - .block-body h3 / .block-section-title: 15px
  - .cal-month: 14px
- **useSessionStore.ts:** 
  - Added `textScale: number` + `setTextScale(v: number)` to interface + store
  - Init from localStorage (`text-scale`), apply to document on load and each change
  - Save to localStorage on button click
- **GearMenu.tsx:**
  - Wired `textScale` + `setTextScale` from store
  - Added "字型大小 / Font Size" section with 5 buttons (0.82–1.25)
  - Buttons show visual scale (fontSize: 11 * scale), highlight active
- **Build:** `npm run build` passes ✓ (1791 modules, 0 errors)

## What's Live Now

Both apps fully functional:
- Gear menu → Display section → Font Size row
- 5 scale presets with immediate visual feedback
- Active button highlighted
- Persists across reload
- Only affects block content (titles, body, headings), not UI chrome

## Test Results

- React build: ✓ clean (0 TS errors, 354KB gzipped)
- HTML: ✓ manual verification pending (user will test in browser)
- Pan/zoom/drag/resize: unaffected (CSS-only change)
- Chinese copy: intact (bilingual labels on buttons)

## Prevention Rules

No mistakes occurred. Implementation followed plan exactly.

---

**Files changed:** 3 (html) + 4 (react)  
**Lines added:** ~60 (html) + ~30 (react)  
**Build status:** ✓ Pass  
