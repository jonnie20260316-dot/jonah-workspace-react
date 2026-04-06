Requested by: User
Executed by: Claude Code
Wrap-up written by: Claude Code

# 2026-04-06 — Phase 11: Daily/Global Block Split + Date Peek + Live Date Refresh (v1.0.9)

## What Was Worked On

Two related features were designed and shipped in this session:

### Lane 1 — Daily vs Global Block Storage Architecture
Established the fundamental design split the app was always intended to have but never enforced:
- **Daily blocks** (journal, kit, intention, tasks): content is date-scoped — each date has its own version
- **Global/persistent blocks** (sticky, intel, threads, metrics, dashboard, swipe, video, etc.): content persists across all dates

### Lane 2 — Date Peek Modal + Sidebar Date History
Added a date-browsing UI to the left sidebar:
- 30-day history list at the bottom of Sidebar with content-presence dots (journal body indicator)
- Clicking a past date opens `DatePeekModal` — a 4-tab frosted-glass modal showing that day's Journal/KIT/Intention/Tasks content WITHOUT navigating away from the current date
- "查看當天" (Go to this day) button in modal footer for optional navigation

### Lane 3 — useBlockField Live Date Refresh (THIS SESSION)
Fixed the core UX gap: switching dates via DateNav did not update the on-screen content of daily blocks.

**Root cause:** `useBlockField` hook initialized state via a `useState` lazy initializer that only runs on mount. When `setActiveDate()` updated `_activeDate` in `storage.ts`, the hook's local state was never re-read.

**Fix:** Added `useSessionStore` subscription + `useEffect` to `useBlockField.ts`. When `activeDate` changes in the Zustand store, the effect fires, re-reads from localStorage (which already sees the new `_activeDate` since it was set synchronously before Zustand fires), and calls `setValue`. Global blocks (`isGlobal = true`) skip the effect entirely.

## What Shipped

| File | Change |
|------|--------|
| `src/constants.ts` | Added `"block-global:"` to `GLOBAL_KEY_PREFIXES` |
| `src/hooks/useBlockField.ts` | Added `options?.global`, `useEffect` date-refresh, `useSessionStore` subscription |
| `src/utils/storage.ts` | Added `loadFieldForDate()` for peek modal |
| `src/components/Sidebar.tsx` | Added 30-day date history section + DatePeekModal integration |
| `src/components/DatePeekModal.tsx` | Full 4-tab modal (journal/KIT/intention/tasks), createPortal, Escape key, frosted glass |
| `src/workspace.css` | `.date-peek-modal` spring animation, `.date-history-row` focus styles |
| `src/blocks/StickyBlock.tsx` | `{ global: true }` on all useBlockField calls |
| `src/blocks/IntelBlock.tsx` | `{ global: true }` on all useBlockField calls |
| `src/blocks/ThreadsBlock.tsx` | `{ global: true }` on all useBlockField calls |
| `src/blocks/MetricsBlock.tsx` | `{ global: true }` on all useBlockField calls |
| `src/blocks/DashboardBlock.tsx` | `{ global: true }` on all useBlockField calls |
| `src/blocks/SwipeBlock.tsx` | `{ global: true }` on all useBlockField calls |
| `src/blocks/VideoBlock.tsx` | `{ global: true }` on all useBlockField calls |
| `package.json` | Version 1.0.8 → 1.0.9 |

**Build:** ✓ 1813 modules, 0 TypeScript errors

## Key Decisions

- `_activeDate` in `storage.ts` is updated **synchronously** before Zustand fires — confirmed this is safe. The effect reads accurate data.
- `fallbackRef` pattern used to prevent infinite loops when callers pass inline `[]` or `{}` as fallback (object identity changes every render without ref).
- Global blocks skip the effect entirely — `if (isGlobal) return;` — zero performance overhead on persistent blocks.
- `loadFieldForDate()` bypasses `_activeDate` entirely, constructing the full localStorage key directly. This makes the peek modal side-effect-free.

## Verification Checklist

- [ ] Switch date → journal/KIT/intention/tasks update immediately
- [ ] Switch back → original content intact
- [ ] Pre-fill future date content → navigate away and back → content persists
- [ ] Sticky/Intel/Swipe: content unchanged across date switches
- [ ] Sidebar date history: clicking past date opens modal without changing DateNav
- [ ] "查看當天" navigates + closes modal + closes sidebar
- [ ] Escape key closes modal
