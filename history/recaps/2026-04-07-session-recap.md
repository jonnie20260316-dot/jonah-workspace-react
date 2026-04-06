Requested by: User
Executed by: Claude Code
Wrap-up written by: Claude Code

# 2026-04-07 — v1.0.10 Fixes (Cross-Device Sync + YouTube Studio Error Handling)

## What Was Worked On

Two focused bug-fix lanes addressing cross-device sync gaps and YouTube Studio usability.

### Lane 1 — Drawing Tool Sync (CRITICAL)
Fixed a critical sync gap: drawing tool shapes, connectors, text, and frames were not syncing across devices even though the sync infrastructure was in place.

**Root cause:** Canvas elements were not included in the `syncableElements` category in `sync.ts`.

**Fix:** Added `"surface-elements"` to the sync categories, ensuring all drawing tool outputs (shapes, connectors, text, frames) now sync in real-time across devices.

### Lane 2 — FAB Menu UX + Unique Block Guards
Enhanced the floating action button (FAB) menu to visually distinguish unique blocks and prevent duplicate creation:
- Added "(限一個)" (one only) labels to journal, kit, and intention blocks in the FAB menu
- When a user tries to add a unique block that already exists, system shows a toast notification and prevents creation
- Non-unique blocks remain fully functional with unlimited adds

### Lane 3 — YouTube Studio Error Surface + Date Handling
Improved YouTube Studio broadcast state transition error handling and fixed date display bugs:
- `transitionBroadcast()` now returns `{ ok, error }` instead of a boolean, capturing the actual YouTube API error body
- Maps `invalidTransition` reason to bilingual user message explaining the stream must be receiving RTMP before transitioning
- `handleTransition()` shows the actual error reason instead of generic "操作失敗"
- Added `formatDate()` guard against missing/invalid `scheduledStartTime` (fixes "Invalid Date" in upcoming broadcasts list)
- Added workflow hint under ready-state buttons: "start streaming first"

## What Shipped

| File | Change |
|------|--------|
| `src/components/FAB.tsx` | Added "(限一個)" labels to unique block types + toast notification logic |
| `src/utils/sync.ts` | Added `"surface-elements"` to sync categories for drawing tool cross-device sync |
| `src/blocks/YouTubeStudioBlock.tsx` | Enhanced error handling + added workflow hints |
| `src/utils/youtubeApi.ts` | Enhanced `transitionBroadcast()` to return error details + added `formatDate()` guard |
| `src/workspace.css` | CSS support for FAB labels |
| `package.json` | Version 1.0.9 → 1.0.10 |

**Build:** ✓ 1813 modules, 0 TypeScript errors

## Key Decisions

- Drawing tool sync uses the same `syncableElements` mechanism as all other block data — no special handling needed once the category was registered.
- FAB unique-block labels are visual-only; the actual guard is a toast + prevention in the block creation handler.
- YouTube API error responses are captured in a separate fetch to ensure the full error body is available (not just the HTTP status).
- `formatDate()` is a defensive helper that prevents "Invalid Date" from appearing when `scheduledStartTime` is missing or malformed.

## Verification Checklist

- [x] npm run build ✓ 1813 modules, 0 TypeScript errors
- [ ] Draw shapes on Device A → check they appear on Device B
- [ ] Draw connectors, text, frames → verify sync works for all surface types
- [ ] FAB menu shows "(限一個)" labels on journal, kit, intention
- [ ] Try adding journal when one exists → toast appears + no duplicate created
- [ ] YouTube Studio: transition broadcast without RTMP stream → error message explains requirement
- [ ] YouTube Studio broadcasts list → no "Invalid Date" entries for upcoming broadcasts
- [ ] Desktop app: Drawing tool sync active after reload

## Commits

- 235cd8c — Cross-device sync + FAB menu UX improvements (v1.0.10)
- 40f979d — YouTube Studio error surface + Invalid Date fix
