# Lessons Locked — Jonah Workspace Round 2 (2026-03-24)

## Section 1 — Session Summary

Clean implementation session. All 5 fixes went in on first attempt with no rework. The bugs fixed were all pre-existing from Round 1 and discovered during UX testing.

Work completed:
- Fix 1: Color picker drag bug (one-line exclusion fix)
- Fix 2: Block body overflow (CSS flex fix)
- Fix 3: Substep delete × button (CSS + markup + JS with index re-mapping)
- Fix 4: Project card delete × button (CSS + markup + JS + `contenteditable="false"`)
- Fix 5: Color picker popover UX (module state + trigger dot + conditional flyout)

---

## Section 2 — Mistakes Extracted (from Round 1 that caused Round 2)

**Bug 1: Color picker swallowed by drag handler**
- **When:** Shipped in Round 1, discovered in Round 2 testing
- **What:** Clicking `.color-dot` span had no effect. `setPointerCapture` on the drag handler swallowed the `click` event.
- **Why:** Exclusion list assumed "interactive = native form element." Custom `<span>` widgets were not considered.
- **Impact:** Color picker silently non-functional from day one. One-line fix once root cause was known.

**Bug 2: Block body overflow**
- **When:** Shipped in Round 1, discovered in Round 2 testing
- **What:** Project cards overflowed past block boundary instead of scrolling.
- **Why:** `height: 100%` used inside flex-column parent. In flex layout, `height: 100%` ≠ "remaining space." Missing `min-height: 0` meant flex item never shrank, so `overflow: auto` had nothing to clip.
- **Impact:** Blocks visually broken with 4+ project cards. CSS-only fix.

**Bugs 3–5: CRUD incompleteness**
- **When:** Shipped in Round 1 (create only), fixed in Round 2
- **What:** Steps and project cards had `+` create but no `×` delete.
- **Why:** Delete was treated as a future enhancement instead of a required pairing with create.
- **Impact:** Double the implementation work (had to add delete retroactively). Revealed 3 non-obvious hazards that would not have been present if designed upfront: label event propagation, contenteditable contamination, checked-index re-mapping.

---

## Section 3 — Root Causes

**Bug 1 — Logic gap:** Drag exclusion list designed by example ("what is natively interactive") rather than by principle ("any element that owns its own pointer interaction"). Custom widgets break this assumption.

**Bug 2 — Knowledge gap:** `height: 100%` inside flex-column is a well-documented footgun. `min-height: 0` overrides flex's default `min-height: auto` — this is non-obvious until you've hit it once.

**Bugs 3–5 — Process gap:** No design-phase checklist enforcing CRUD completeness. Create and delete treated as separate features rather than a paired atomic unit.

---

## Section 4 — Prevention Rules

### Rule JW-4 — Drag Handle Interactive Element Exclusion

**Trigger:** Adding any custom interactive widget (span, div, color dot, toggle) inside a container with a `pointerdown` drag handler.

**Checklist:**
1. Write the drag exclusion selector as a principle, not a list: "any element that owns its own pointer interaction"
2. Use `data-*` attributes on all custom interactive elements as the canonical exclusion hook (not tag names/classes)
3. After adding any new interactive widget inside a draggable container, grep the drag handler exclusion selector and confirm coverage
4. Test every new interactive element inside a draggable container with a pointer click before marking done

**Escape hatch:** Click silently fails inside draggable container → inspect drag handler exclusion selector first → add missing `data-*` attribute to element AND exclusion list → one-line fix.

---

### Rule JW-5 — CRUD Completeness Pairing

**Trigger:** Designing or implementing any create affordance (add button, form, Enter key) for a list or collection.

**Checklist:**
1. At design time, before any code: ask "what does delete require for this data structure?" — answer in writing
2. Create and delete ship together. Delete is never deferred.
3. Before implementing delete: identify all interaction containers the element lives in (inside `<label>`? `contenteditable`?)
   - Inside `<label>` → `event.preventDefault()` + `event.stopPropagation()` on delete handler
   - Inside `contenteditable` → set `contenteditable="false"` on the delete button
4. If list uses numeric indices in state → define re-index function first: delete at `i` → shift all indices `> i` down by 1
5. Verification: create 3 items, delete the middle one, confirm state integrity

**Escape hatch:** Create shipped without delete → treat as blocking defect, not polish → always adds hidden complexity (labels, contenteditable, indices) the longer it's deferred.

---

### Rule JW-6 — Flex Scroll Child Pattern

**Trigger:** Applying `overflow: auto`/`scroll` to a flex child that should scroll its content.

**Checklist:**
1. Never write `height: 100%` on a flex child expecting "remaining space" → use `flex: 1`
2. Always pair `overflow: auto` on a flex child with `min-height: 0` (column) or `min-width: 0` (row)
3. Verify the full chain: every ancestor between scrollable element and nearest sized ancestor must have `flex: 1` or `min-height: 0`
4. Fill the scrollable region past capacity before marking done

**Escape hatch:** Content overflows container that should scroll → check `min-height`/`min-width` on the flex child → adding `min-height: 0` is almost always the fix.

---

## Section 5 — Integration Points

| Phase | Rule |
|-------|------|
| Design (before any code) | JW-5 (CRUD): answer "what does delete require?" for every list feature |
| Build | JW-4: update drag exclusion immediately when adding interactive widget inside drag handle |
| Build | JW-6: pair `overflow: auto` with `flex: 1; min-height: 0` at the same time |
| Build | JW-5: implement re-index logic and event isolation before writing delete handler |
| Verification | Click all interactive elements inside draggable containers |
| Verification | Fill all scrollable panels past capacity |
| Verification | Create 3 items, delete middle, confirm state integrity |
