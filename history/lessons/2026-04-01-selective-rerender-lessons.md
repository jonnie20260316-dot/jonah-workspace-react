# Lessons Locked — 2026-04-01

Session: Selective Block Re-rendering (stop renderBoard from killing Spotify)

---

## Section 1: Mistakes Extracted

### Mistake 1: Modal close nullifies blockId before rerenderBlock uses it

- **When:** After migrating threads-intel and prompted-notes modal saves from `renderBoard()` to `rerenderBlock(tiModalBlockId)`
- **What:** `closeThreadsIntelModal()` sets `tiModalBlockId = null` (line 4896) before `rerenderBlock(tiModalBlockId)` executes. Same for `closePromptedNotesModal()` with `pnModalBlockId` (line 4616). `rerenderBlock(null)` silently no-ops.
- **Why:** Developer didn't read what the close function mutates before reordering calls. The pattern `closeModal(); rerenderBlock(modalBlockId)` looks correct but `closeModal()` nullifies the variable.
- **Impact:** Threads-intel and prompted-notes saves silently failed to re-render. Data saved to localStorage but block didn't update visually. User had to refresh page.

### Mistake 2: Incomplete call-site migration

- **When:** During Phase 3 migration of `renderBoard()` → `rerenderBlock()`
- **What:** Initial migration covered `bindBlockEvents()` (lines 5181-5740) but missed ~8 call sites in modal functions (lines 3400-4900): threads-intel save/delete, prompted-notes config/entry/delete, card modal close, hook parse/choose, TI import.
- **Why:** Plan only categorized call sites inside `bindBlockEvents()`. Modal functions in a different code region were not systematically scanned.
- **Impact:** User reported Spotify music stopping when saving threads-intel analysis. Required second migration round.

### Mistake 3: Full renderBoard still destroys iframe

- **When:** After all migrations complete, user reported adding a new block still kills music
- **What:** `addBlock()` calls `renderBoard()` — a structural operation that legitimately needs full re-render. But `renderBoard()` does `innerHTML = ""` which destroys the Spotify iframe.
- **Why:** Plan assumed migrating content-only operations would solve the problem completely. The actual invariant was "Spotify iframe must survive DOM mutations" — not "avoid calling renderBoard."
- **Impact:** Music still stopped on block creation. Required iframe preservation logic inside `renderBoard()` itself.

---

## Section 2: Root Causes

### Root Cause A: Use-after-mutation (Mistake 1)
- Close functions treat module-level variables as owned state and null them
- Any function called after close that reads these variables receives null
- No error thrown, no console warning — silent failure

### Root Cause B: Incomplete enumeration (Mistake 2)
- In a 7,900-line single-file codebase, function calls are spread across distant regions
- Developer processed the first cluster and assumed "done"
- No written inventory of all call sites before starting edits

### Root Cause C: Wrong fix level (Mistake 3)
- Developer optimized at call-site level when root cause was in function body
- Invariant was "iframe must survive" not "avoid calling renderBoard"
- Structural operations cannot be migrated away from renderBoard

---

## Section 3: Prevention Rules

### JW-19: Capture-Before-Close

**Trigger:** Any code sequence where a close/cleanup function is called before a function that uses module-level state set during the open/init phase.

**Checklist:**
1. Before writing `closeX(); doSomething(moduleVar);`, read what `closeX()` does to `moduleVar`
2. If `closeX()` nullifies/resets `moduleVar`, capture first: `const captured = moduleVar; closeX(); doSomething(captured);`
3. Search for `= null` inside the close function body to identify all state it clears
4. If the close function clears N state variables, verify every variable used after the call has been captured

**Escape hatch:** Reorder to `doSomething(moduleVar); closeX();` — but only if DOM state after doSomething is compatible with subsequent close.

**Why:** Modal patterns use module-level variables as implicit function parameters. Close functions null them. Any function called after close receives null, producing an invisible no-op.

### JW-20: Exhaustive Call-Site Enumeration Before Refactor

**Trigger:** Replacing or migrating calls to a function (e.g., changing `renderBoard()` to `rerenderBlock()`).

**Checklist:**
1. Grep the entire file for the function name. Record **total count** and **every line number**
2. Categorize each call site (modal saves, block events, structural ops, import/export)
3. For each group: migrate, skip (with reason), or special handling
4. After migration, grep again. Remaining count must equal skip + special handling exactly
5. For 10+ call sites in files >5000 lines, write the inventory before starting edits

**Escape hatch:** For <5 call sites, inline enumeration during editing is acceptable.

**Why:** In a 7,900-line file, the developer migrated call sites in one region but missed 8 in another. Without a written inventory, the brain fills in "done" after the first cluster.

### JW-21: Invariant-First Fix Design

**Trigger:** Fixing a bug where a function destroys state that should be preserved (DOM elements, data structures, event listeners).

**Checklist:**
1. State the invariant in one sentence (e.g., "Spotify iframe must survive any DOM update")
2. Identify **all paths** that violate the invariant — grep for the destroying operation
3. Decide fix level: call-site (replace callers), function-body (protect inside the function), or both
4. After implementing, test against: (a) reported path, (b) structural operation, (c) bulk operation

**Escape hatch:** If function-body fix is too risky, migrate callers first, then harden function body in separate commit.

**Why:** Developer treated "music stops on save" as a call-site problem. The actual violation was inside `renderBoard()` itself. Fixing only call sites left the invariant unprotected for addBlock, delete, and archive.

---

## Section 4: Integration Points

- JW-19, JW-20, JW-21 added to CLAUDE.md Prevention Rules table
- JW-19, JW-20, JW-21 added to MEMORY.md Prevention Rules table
- All three rules apply to future single-file app refactors
