# Session Recap — 2026-04-04: Whiteboard Surface Fixes

## Summary
- Made newly created whiteboard surface objects editable after creation.
- Moved the fit-to-content control away from the add-block FAB so it no longer blocks clicks.
- Verified the app still builds cleanly after the interaction changes.

## What Changed
- Connectors can now be dragged after creation via a larger hit target in `SurfaceForeground`.
- Frames can now be moved and resized after creation, with visible corner handles and a larger minimum size.
- Frame creation now commits a more usable default size so header controls do not crowd the surface.
- The fit-to-content control moved to the bottom-left corner, removing overlap with the add-block button.

## Verification
- `npm run build` passes.
- The update is scoped to the whiteboard interaction layer and fixed viewport controls; block drag/resize behavior is unchanged.

## Lessons Locked
- See `history/lessons/2026-04-04-whiteboard-surface-fixes-lessons-locked.md` for the prevention rules added from this session.
