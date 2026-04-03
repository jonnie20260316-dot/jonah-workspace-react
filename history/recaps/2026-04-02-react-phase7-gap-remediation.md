# Session Recap — 2026-04-02 | React Phase 7: Gap Remediation

**Requested by:** User  
**Executed by:** Claude Code  
**Wrap-up written by:** Claude Code

---

## Overview

Closed all critical functional gaps between `jonah-workspace-react` and `workspace.html`. The React app now has full mechanism parity for the timer block, pervasive bilingual reactivity, and a working calendar date picker.

**Design north star (unchanged):** Apple Notes meets Linear meets Notion — warm, tactile, precise, breathing.

---

## What Was Shipped

### Step 1 — Token Fixes & CSS Foundation
- `src/styles/tokens.css` — Added `--surface-card` token; fixed font stack: `PingFang TC` now comes before `PingFang SC` (Traditional Chinese first)
- `src/styles/animations.css` — 4 new keyframes: `timerOvertimePulse`, `calPopupIn/Out`, `timerSettingsIn/Out`
- `src/workspace.css` — ~350 lines of new CSS for timer ring, daily stats, session log, calendar, timer settings

### Step 2 — Bilingual System (Pervasive)
- **New:** `src/hooks/useLang.ts` — Zustand selector hook; calling `useLang()` registers any component for re-render when language changes
- **Updated:** `BlockRegistry.ts` — All 18 block types now have `zhTitle` and `zhSubtitle`
- **Updated:** `BlockShell.tsx` — Block headers now use `pick(cfg.zhTitle, cfg.title)` — switch between Chinese and English
- **Updated:** `DateNav`, `Sidebar`, `FloatingTopBar`, `FAB`, `SelectiveSyncModal` — all now call `useLang()` and re-render on language toggle
- **FAB picker** — Block names and subtitles are now bilingual via `pick(zhTitle, title)`

### Step 3 — Timer Progress Ring
- **New:** `src/blocks/TimerRing.tsx` — SVG circular progress ring
  - `stroke-dasharray` / `stroke-dashoffset` approach (not CSS conic-gradient — avoids `@property` Safari issues)
  - 5 color states: idle (tertiary), work (accent teal), rest (gold), overtime (danger red)
  - `transition: stroke-dashoffset 1s linear` when running — smooth animation between React's 1-second ticks
  - Inner face: mode label + time digits (Songti TC font) + status label + overtime badge
  - `will-change: stroke-dashoffset` promotes to compositor layer

### Step 4 — Timer Store Extension
- **Updated:** `src/types.ts` — Added `TimerSession` interface
- **Updated:** `src/stores/useTimerStore.ts` — Added session state + `loadSessions`, `logSession`, `deleteSession`, `updateSession` actions (all JW-24 compliant: go through store, never direct localStorage)
- **Updated:** `src/hooks/useTimerTick.ts` — Auto-logs session on overtime cap (120 min); tracks `sessionStartRef` for accurate `startedAt`

### Step 5 — Daily Focus Stats
- **New:** `src/hooks/useTimerStats.ts` — Computes `totalMin`, `count`, `average`, `targetMin` from work sessions only
- **New:** `src/blocks/DailyFocusStats.tsx` — Progress bar + 3 stat cards (分鐘/Minutes, 工作階段/Sessions, 平均/Average); exceeded state turns gold; click target to edit inline

### Step 6 — Session Log
- **New:** `src/blocks/SessionLog.tsx` — Expandable list of today's sessions
  - Toggle button with chevron rotation
  - `SessionLogItem` extracted as named child component (JW-29: no hooks in `.map()`)
  - Inline task rename + delete with confirmation
  - Rest sessions shown with note: "休息不計入每日目標"

### Step 7 — Calendar Date Picker
- **New:** `src/components/CalendarModal.tsx` — Full calendar popup
  - 7-column grid, 42-cell layout (6 rows × 7 cols with prev/next month padding)
  - Month navigation with ChevronLeft/ChevronRight
  - Bilingual month header: `2026年 4月` / `April 2026`
  - States: `.cal-today` (accent bold), `.cal-active` (filled), `.cal-has-data` (dot indicator)
  - Closes on outside click (mousedown listener) and Escape key
  - Animation: `calPopupIn` on mount
- **Updated:** `DateNav.tsx` — Date button now opens CalendarModal; onSelectDate calls `setActiveDate()`

### Step 8 — Timer Settings Panel
- **New:** `src/blocks/TimerSettings.tsx` — Collapsible settings at bottom of TimerBlock
  - Daily goal input (number, step 15, min 0, max 960)
  - Auto-overtime toggle (Apple-style CSS toggle switch)
  - Notification toggle
  - Sound picker: 3 built-in (None, Bell, Chime) + custom uploads (max 5, 1MB each)
  - `SoundPickerItem` extracted as named child component (JW-29)
  - `getBuiltinSounds()` function called at render time — NOT module-level constant (JW-31)
  - JW-28: Audio preview objects cleaned up on `audio.onended`

### Step 9 — TimerBlock Final Assembly
- **Rewritten:** `src/blocks/TimerBlock.tsx`
  - Composition: mode toggle → presets → TimerRing → task input → controls → divider → DailyFocusStats → SessionLog → TimerSettings (collapsible)
  - Settings trigger: `<Settings>` Lucide icon button (14px) in header area
  - Pause now auto-logs session if elapsed > 60s
  - `useEffect` loads sessions when `activeDate` changes (JW-24: via `loadSessions()`)
  - Timer height in BlockRegistry: 320 → 520

### Step 10 — Build Verification + Pre-existing Bug Fixes
- Fixed pre-existing Phase 5 type errors in `useSyncStore.ts` and `useSyncBoot.ts`:
  - `ReturnType<typeof Array.isArray>` → `ProjectCard[]` (was incorrectly evaluating to `boolean`)
  - Added `FSHandle` type with `requestPermission`/`queryPermission` methods
  - Added `FSHandleBoot` type in `useSyncBoot.ts`
  - Cast `window.showDirectoryPicker` via `(window as unknown as ...)` pattern
- **Final build:** `✓ built in 178ms`, 1789 modules, 343KB (99KB gzipped), 0 TypeScript errors

---

## Lessons Locked

Two new prevention rules discovered:

**JW-30: `tsc -b` is the build gate, not `tsc --noEmit`**
- Root `tsconfig.json` has `"files": []` with project references. `tsc --noEmit` checks NOTHING.
- Always use `npm run build` as the final TypeScript verification step.

**JW-31: `pick()` at module scope is frozen**
- `pick()` reads module-level `_lang` at call time. Constants defined outside React components freeze in the initial language.
- All bilingual string data must be inside render functions or `useMemo`. Never `const FOO = [{ name: pick(...) }]` at module level.

See `history/lessons/2026-04-02-phase7-lessons-locked.md` for full analysis.

---

## File Inventory

### New Files (7)
| File | Purpose |
|------|---------|
| `src/hooks/useLang.ts` | Zustand lang selector for reactive bilingual re-renders |
| `src/hooks/useTimerStats.ts` | Computed daily focus stats from timer sessions |
| `src/blocks/TimerRing.tsx` | SVG circular progress ring |
| `src/blocks/DailyFocusStats.tsx` | Progress bar + 3 stat cards |
| `src/blocks/SessionLog.tsx` | Expandable session history with edit/delete |
| `src/blocks/TimerSettings.tsx` | Collapsible settings panel |
| `src/components/CalendarModal.tsx` | Date picker popup |

### Modified Files (13)
`tokens.css`, `animations.css`, `workspace.css`, `types.ts`, `useTimerStore.ts`, `useTimerTick.ts`, `BlockRegistry.ts`, `BlockShell.tsx`, `TimerBlock.tsx`, `DateNav.tsx`, `FAB.tsx`, `FloatingTopBar.tsx`, `Sidebar.tsx`, `SelectiveSyncModal.tsx`, `useSyncStore.ts` (pre-existing bug fix), `useSyncBoot.ts` (pre-existing bug fix)

---

## Pending (JW-16 Gate)

Visual smoke test still needed:
- [ ] Timer ring fills clockwise, all 5 color states
- [ ] Daily stats compute from logged sessions
- [ ] Session log expands/collapses, edit/delete work
- [ ] Calendar popup opens, navigates months, selects dates
- [ ] Timer settings open/close, controls persist
- [ ] Language toggle switches ALL headers, labels, buttons
- [ ] PingFang TC renders correctly

---

**Status:** Implementation complete. Build passes. Pending browser visual verification (JW-16).
