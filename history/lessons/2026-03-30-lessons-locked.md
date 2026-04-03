# Lessons Locked — 2026-03-30

## Section 1 — Mistakes Extracted

### Mistake 1: Hook block add-flow broke after the UI expansion
- **When:** Browser smoke test after shipping the new Hook block
- **What:** Adding a block could fail because `newBlock()` still referenced `BOARD_WIDTH` and `BOARD_HEIGHT`
- **Why:** The new hook frontdoor exercised the add-block path in a way that exposed an older stale constant dependency
- **Impact:** The new feature looked implemented in file review, but the actual UI loop was broken until runtime verification caught it

## Section 2 — Root Cause Analysis

### Root Cause A: Board geometry lost a single source of truth
The codebase had already moved toward `boardSize.w` and `boardSize.h`, but one older block-spawn path still depended on removed globals. The feature itself was fine; the shared board-geometry path was not fully normalized.

### Root Cause B: Static correctness was mistaken for runtime correctness
The new Hook block was structurally correct on inspection. Only a real browser test exposed that the add-block interaction still crossed an old code path.

## Section 3 — Prevention Rules

### JW-17 — Board Geometry Single Source

**Trigger:** Any work that touches block spawning, centering, board dimensions, viewport math, or add-block flows.

**Checklist:**
1. Treat `boardSize.w` and `boardSize.h` as the only live board-dimension source
2. Grep for older geometry constants or aliases before finishing
3. After changing add-block or block layout flows, create a fresh block in the browser and confirm it appears correctly
4. Check console errors after the add-flow, not just after initial page load

**Escape hatch:** If block creation or centering fails unexpectedly, inspect the block-spawn path for stale globals before debugging the new feature itself.

## Section 4 — Integration Points

- Add `JW-17` to the active prevention rules table in `CLAUDE.md`
- Apply it any time `newBlock()`, viewport logic, or board sizing changes
- Keep `JW-16` and `JW-17` paired:
  - `JW-16` proves the feature renders
  - `JW-17` proves the shared board geometry path is still coherent
