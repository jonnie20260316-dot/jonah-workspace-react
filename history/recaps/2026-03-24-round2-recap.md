# Session Recap — 2026-03-24 Round 2

**Project:** Jonah Workspace (`workspace.html`)
**Session type:** Bug fixes + CRUD completion + color picker UX upgrade

---

## What We Fixed

### Fix 1: Color picker drag bug (one line)
- **Root cause:** `setPointerCapture` on the drag handler swallowed `click` events on `.color-dot` spans
- **Fix:** Added `[data-block-color],[data-color-toggle]` to the `pointerdown` exclusion selector (line 2687)
- Color changes now work and persist across reload

### Fix 2: Block body overflow (CSS only)
- **Root cause:** `height: 100%` inside flex-column doesn't mean "remaining space" — content overflowed
- **Fix:** Changed `.block-body` to `flex: 1; min-height: 0` — blocks with many cards now scroll internally

### Fix 3: Substep delete × button
- Hover any substep → × appears on right → click removes it
- Handler re-indexes checked state: indices < deleted stay, indices > deleted shift down by 1
- `event.preventDefault()` + `event.stopPropagation()` prevent label checkbox toggle

### Fix 4: Project card delete × button
- Hover any project card → × appears top-right → click removes from any column
- `contenteditable="false"` on button prevents it becoming editable text inside the card
- `deleteProjectCard(cardId)` function searches all columns and splices the card

### Fix 5: Color picker popover UX
- Replaced always-visible 7 dots with single trigger dot showing current color
- Click → flyout pill opens with all 7 color options
- Click color → flyout closes + color applied
- Click outside → flyout closes (document-level `pointerdown` listener)
- Module-level `colorPickerOpenFor = null` tracks which block has flyout open

---

## Files Changed

| File | What changed |
|------|-------------|
| `workspace.html` | All 5 fixes above |
| `WORKSPACE-LOG.md` | Round 2 session added |
| `2026-03-24-lessons-locked-round2.md` | This file's companion — 3 prevention rules (JW-4, JW-5, JW-6) |
| `2026-03-24-round2-recap.md` | This file |

---

## Lessons Locked (summary)

See `2026-03-24-lessons-locked-round2.md` for full detail.

- **JW-4 (Drag exclusion):** Custom interactive elements inside `[data-drag-handle]` must be explicitly added to the `pointerdown` exclusion selector. `button,input,textarea,select` is not enough — any `<span>` or `<div>` with pointer interaction needs its `data-*` attribute in the exclusion list.
- **JW-5 (CRUD completeness):** Create and delete ship together, always. Before writing create logic, answer "what does delete require?" in writing. Delete inside `<label>` needs `preventDefault/stopPropagation`. Delete inside `contenteditable` needs `contenteditable="false"` on the button. Indexed lists need re-index logic.
- **JW-6 (Flex scroll child):** `height: 100%` inside flex-column is wrong. Use `flex: 1; min-height: 0` on any flex child that needs to scroll. Always pair `overflow: auto` with `min-height: 0`.

---

## What's Next (remaining lanes)

2. **Block system expansion** — more block types + templates; better archive/discovery
3. **Threads sender block** — clean writing surface, payload-ready JSON for n8n
4. **OpenClaw dashboard block** — file-import based status views (no backend)
5. **Journal + KIT upgrades** — history/calendar scaffolding + data shapes for long-term reporting

**Unplanned but worth considering later:**
- Task card expand to detail view (click card → full editor with description, tags, assignee)
- Tag system on project cards (client / automation / content / personal)
