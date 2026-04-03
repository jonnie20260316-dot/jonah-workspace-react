# Lessons Locked — 2026-03-25 (Jonah Workspace Round 7)

**Session:** Indestructible Persistence — 7-layer defense system
**File:** `/Users/jonnie/jonah-workspace/workspace.html`

---

## Section 1: Mistakes Extracted

### Mistake 1: Recursive function created by global replace-all
- **When:** Step 3 (UndoStack) — adding `saveProjectBoard()` helper
- **What:** Created `saveProjectBoard()` wrapper function, then did a global replace-all of `saveJSON("project-board", projectBoard)` → `saveProjectBoard()`. The replace-all also rewrote the body of `saveProjectBoard()` itself, making it recursively call itself.
- **Why:** The replace-all was applied across the entire file without excluding the function definition that contained the target string.
- **Impact:** Would have caused infinite recursion + stack overflow on any kanban card save. Caught and fixed before the file was tested.

### Mistake 2: popUndo calling saveProjectBoard instead of direct saveJSON
- **When:** Step 3 — after the replace-all ran
- **What:** `popUndo()` originally had a direct `saveJSON("project-board", ...)` call, which the replace-all converted to `saveProjectBoard()`. This would have called `pushUndo()` during undo restoration — partially mitigated by the `undoRestoring` flag, but still unclean.
- **Why:** Same replace-all scope issue. Functions that should bypass wrappers (undo restore, checkpoint restore) were not excluded.
- **Impact:** Minor — `undoRestoring` flag would have caught the push. But violates principle of clarity. Fixed to use direct `saveJSON`.

---

## Section 2: Root Causes

### Root Cause A: Replace-all has no "skip this function" awareness
Global find-and-replace is applied uniformly — it doesn't know which occurrences are inside the function you just defined. In a single-file app with many similar call patterns, this creates a collision between the new wrapper and its internal body.

**Pattern:** `function doX() { doX(); }` (accidental self-reference)

### Root Cause B: Bypass code not identified before global replace
When adding a wrapper that should be bypassed in certain contexts (undo restore, crash recovery, snapshot restore), those bypass sites were not identified before the replace-all ran.

**Pattern:** Replace-all creates new callers in code that intentionally bypassed the wrapper.

---

## Section 3: Prevention Rules

### JW-12 — Undo Flag Guard
**Trigger:** Any time an undo/restore function writes to the same store that its push function monitors.
**Rule:** Always use a boolean flag (`undoRestoring`, `checkpointRestoring`, etc.) to prevent re-entry. Set the flag BEFORE any call that could trigger a push. Clear it AFTER all saves complete. The flag must be checked at the TOP of `pushUndo()`.
**Checklist:**
1. Write the flag declaration next to the stack declaration
2. Set flag at start of restore function
3. Verify all push paths check the flag
4. Clear flag only after `renderBoard()` + `restoreViewport()` complete
**Escape hatch:** If stack grows unexpectedly, add `console.log(undoStack.length)` before each push to trace the caller.

### JW-13 — Replace-All Audit
**Trigger:** Any global find-and-replace of a function call pattern (e.g., `saveJSON("x", ...)` → `saveX()`).
**Rule:** After running replace-all, immediately scan for the target string inside the new wrapper function itself. If it appears there, it's a recursive call — fix it to use the direct underlying write.
**Checklist:**
1. Run the replace-all
2. Immediately read the wrapper function definition (5–10 lines)
3. Confirm no self-reference exists
4. Also scan any restore/undo/checkpoint functions that should bypass the wrapper
5. Fix those to use direct `saveJSON` / `localStorage.setItem`
**Escape hatch:** Run brace-balance check (`python3 -c "..."`) to catch infinite recursion before browser test.

---

## Section 4: Integration Points

These rules apply to **workspace.html** development specifically:

- `saveBlocks()` and `saveProjectBoard()` are the two wrapper functions with `pushUndo()` inside — any new save wrapper follows the same pattern and needs the same bypass audit.
- `popUndo()`, `restoreSnapshot()`, `importPayload()` are the three restore functions that MUST use direct `saveJSON` — never the wrapper.
- When adding a new IndexedDB snapshot type or export format, run the full bypass audit before testing.

---

**Filed:** 2026-03-25
**Rules added to MEMORY.md:** JW-12, JW-13
