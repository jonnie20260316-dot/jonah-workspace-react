# Session Recap — 2026-04-01: Selective Block Re-rendering

**Requested by:** User
**Executed by:** Claude Code (Opus 4.6)
**Wrap-up written by:** Claude Code (Haiku 4.5)

## What Was Worked On

Architecture change to replace unnecessary full-board `renderBoard()` calls with surgical `rerenderBlock(blockId)` — preventing Spotify iframe destruction during unrelated block operations. Long-term performance investment as block count grows.

## What Shipped

### New Functions
- `rerenderBlock(blockId)` — finds existing `<article>`, replaces only its innerHTML, re-binds scoped listeners
- `rerenderProjectsBlock()` — convenience wrapper for kanban operations (finds projects block by type)

### Parameterized Binding Functions
- `bindBlockEvents(scope)` — accepts optional article element; uses `$scoped()` alias instead of global `$$()` (39 selector replacements)
- `bindProjectBoardEvents(scope)` — accepts optional scope element

### Iframe Preservation in renderBoard()
- Before `innerHTML = ""` nuke: detach live `.spotify-frame` iframes into a Map
- After rebuilding articles: restore saved iframes via `replaceWith()`
- Music survives ALL operations: block add, delete, archive, language switch, undo

### Call Site Migrations (~30 sites)
- **Phase 1 (reported bugs):** Task step Enter, kanban card drag
- **Phase 2 (task/project ops):** Task done, step check/delete/edit/reorder, project card add/delete, card modal title/tag/close
- **Phase 3 (other blocks):** Spotify preset/compact, dashboard view, threads-intel tab/search/filter/load-more, prompted-notes config/entry/delete, swipe mode, color change/toggle, intel load/import, hook parse/choose, TI import
- **~35 remaining renderBoard() calls** are structural (block create/delete, language switch, undo, import/export)

### Bug Fixes During Session
1. **Modal close nullifies blockId** — `closeThreadsIntelModal()` and `closePromptedNotesModal()` set module-level blockId to null before `rerenderBlock()` could use it. Fixed with capture-before-close pattern: `const bid = blockId; closeModal(); rerenderBlock(bid);`
2. **Incomplete migration** — initial pass missed ~8 call sites in modal functions (threads-intel save/delete, prompted-notes save/delete, card modal close, hook handlers, TI import). Fixed in follow-up round.
3. **Full renderBoard still kills iframe** — structural operations (addBlock, archive) legitimately need full re-render but still destroyed iframes. Fixed by adding iframe detach/reattach inside `renderBoard()` itself.

### bindDataStores Fix
- Lines 4964-4965: `renderBoard()` calls for `:embed` and `:view` store changes replaced with `rerenderBlock()` using `field.closest("[data-id]")` to find the block ID

## Files Changed

| File | Change |
|------|--------|
| `workspace.html` | ~30 new lines (rerenderBlock, rerenderProjectsBlock, iframe preservation), ~40 lines changed (call site migrations, binding parameterization) |

## Visual Verification (Playwright)

All tests passed:
1. Task step Enter → Spotify iframe preserved ✅
2. Task done checkbox → Spotify iframe preserved ✅
3. Color toggle → Spotify iframe preserved ✅
4. Spotify compact toggle → iframe rebuilt (expected, same block) ✅
5. Project card add → Spotify iframe preserved ✅
6. Direct renderBoard() call → iframe preserved ✅
7. Triple rapid renderBoard() → iframe preserved ✅
8. Console errors: NONE ✅

## Lessons Locked

3 new prevention rules created:
- **JW-19 (Capture-Before-Close):** When calling closeModal() before rerenderBlock(), capture module-level state first
- **JW-20 (Exhaustive Call-Site Enumeration):** Grep all call sites before starting a function migration refactor
- **JW-21 (Invariant-First Fix Design):** State the DOM invariant being protected, then fix at the right level (call-site vs function-body)

See `history/lessons/2026-04-01-selective-rerender-lessons.md` for full analysis.

## Status

✅ **Selective block re-rendering complete and live.** Spotify music survives all operations.

---

**Session timing:** ~2 hours (plan mode + 8 implementation steps + 2 bug fix rounds + verification)
**Model:** Opus 4.6
**Effort:** 3 mistakes caught and fixed; all from the same root pattern (incomplete enumeration of side effects)
