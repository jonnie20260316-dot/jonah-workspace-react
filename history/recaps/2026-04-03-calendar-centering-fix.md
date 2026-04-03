# Session Wrap-Up: 2026-04-03 — Calendar Centering Fix

**Requested by:** User  
**Executed by:** Claude Code  
**Wrap-up written by:** Claude Code  

## What Was Worked On

Calendar popup in React workspace (DateNav component) was not centering properly under the trigger button. Initial attempts to fix via `position: relative/absolute` failed due to CSS containment issues with a transformed ancestor.

## What Shipped

Fixed calendar centering by:
1. Converting `CalendarModal` to use React portal (`createPortal`) rendering at `document.body` level
2. Capturing button's `getBoundingClientRect()` at click time in `DateNav`
3. Positioning popup with `position: fixed` using exact viewport coordinates
4. Added viewport-edge clamping (8px margin) to prevent overflow off-screen

**Files changed:**
- `src/components/DateNav.tsx` — added ref + anchor rect capture, portal invocation
- `src/components/CalendarModal.tsx` — portal rendering, fixed positioning with getBoundingClientRect math
- `src/workspace.css` — removed `position/top/left/transform` from `.cal-popup` (now inline)

**Result:** Calendar now reliably centers under the date button, escaping the transformed `FloatingTopBar` ancestor.

## Still In Progress / Pending

None — feature complete.

## Key Decisions Made

**Why portal?** The `FloatingTopBar` uses `transform: translateX(-50%)` to center itself on screen. This transform makes the bar a CSS containing block for `position: fixed` children (non-standard but real CSS behavior). `position: absolute` was also affected. The only reliable solution was to render the calendar outside the transformed container entirely.

**Why getBoundingClientRect()?** Direct viewport coordinates are immune to ancestor transforms, scales, and viewport scrolls. This is the simplest, most robust approach for overlays.

## Lessons Locked

See `2026-04-03-lessons-locked.md` for root cause analysis and prevention rule.
