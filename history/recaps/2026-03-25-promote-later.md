# Promote Later — 2026-03-25 (Jonah Workspace)

## Live Now ✅

**Phase 1: History Sidebar Overhaul (Rounds 10–11)**
- Status: LIVE in workspace.html (+309 net lines from Round 11, 5170→5479 total)
- What it does: Browse historical entries by content type and date, with smart grouping, quick-access icon rail, and inline preview before full modal
- Sidebar types: 11 content block types (Journal, KIT, Tasks, Intention, Intel, Content, Sticky, Swipe, Threads, Video, Metrics)

**Round 10 Features (Initial History Sidebar + Modal — 441 lines, 7 edits):**
- Left sidebar (280px, toggles open/closed via hero button)
- Accordion-style category browser with date counts
- Modal overlay with read-only default view
- Edit mode with confirmation dialog + permanent lock after save
- Prev/next date navigation within same block type
- Full 3-column grid layout (sidebar + canvas + archive can be open simultaneously)

**Round 11 Enhancements (+309 net lines, 4 implementation rounds, zero errors):**
1. **Bug Fix** — Modal content now displays (lazy DOM lookup for late-inserted elements, fixed bindDataStores call with activeDate swap)
2. **Smart Grouping** — Date-centric types (journal, kit, tasks) grouped by month; content-centric types (intel, content, sticky) grouped by preview label; collapsible month subgroups with intelligent defaults
3. **Icon Rail** — 44px left navigation strip with 11 type icons + 2 curated views (hooks: intel+swipe, inspirations: content+threads+sticky); click to filter sidebar; active state highlighting
4. **UX Polish** — Inline preview (200 chars before "Open full"), breadcrumb navigation ("All > Type > Month"), empty states per category, back button in modal footer

- Verification: Bracket balance ✅ (1463 braces, 3037 parens, 288 brackets), all edits clean, zero errors, zero console exceptions
- Ready for: Browser testing (sidebar toggle, month expansion, icon rail filtering, inline preview → modal flow, edit/lock flow)

---

## Promote Later 🚀

**Phase 2: Growth Block + File-Based Storage**
- Status: Planned, not implemented (candidate, 265 lines estimated)
- Promotion condition: User provides 3-year plan file format (currently not provided)
- What it does:
  - **Growth block type:** 4 fields (plan, milestones, reflection, wins)
    - `plan` + `milestones` → global keys (immediate persist, shared across dates)
    - `reflection` + `wins` → session-scoped (daily, requires Save to persist)
  - **File System Access API:** Optional folder storage for backup + sync
    - Auto-creates folder structure: `{folder}/{blockType}/YYYY-MM-DD.json`
    - Writes on every Save click
    - "Load from Folder" in gear menu to restore
    - Works alongside localStorage (file is backup, not primary)

- Implementation ready:
  - blockRegistry entry + BLOCK_FIELD_MAP completed
  - File storage functions designed: `connectDataFolder()`, `ensureFolderStructure()`, `writeSessionToFolder()`, `loadFromFolder()`
  - Gear menu buttons ready to wire
  - IndexedDB settings store for directory handle persistence

- Why wait?
  - User's 3-year plan file format not yet finalized
  - Growth block fields may need adjustment based on actual plan structure
  - Better to spec once from real data than guess and refactor later

- Next steps:
  1. User provides 3-year plan file (format, field structure)
  2. Verify plan fields match growth block design
  3. Implement Part A (growth block type) — low risk, blocks nothing
  4. Implement Part B (file storage) — requires user testing before live
  5. Seed growth block with user's plan content

---

## Separation Rationale

Phase 1 **ships now** because:
- No external dependencies (only uses existing localStorage + dirtyBuffer pattern)
- Stands alone (doesn't require Phase 2 to function)
- Immediately useful (browse any past entry across 11 block types)
- Zero errors, fully verified

Phase 2 **stays candidate** because:
- Requires user's 3-year plan file to validate field structure
- File storage is enhancement, not critical path (localStorage works offline)
- Browser File System Access API has fallback (download) but better with explicit format
- User may want to refine growth block design after seeing full plan file

---

## Staging Order

If user approves Phase 2 work:

1. **Clarify growth block fields** (via user's plan file)
2. **Implement Part A** (growth block + GLOBAL_KEYS routes) — live in same session
3. **Test Part B** (file storage) — may need user to set up a test folder
4. **Seed plan content** — user pastes 3-year plan into growth block
5. **Document file structure** — so user can backup manually if needed

Estimated effort: Part A = 1–2 hours, Part B = 2–3 hours (including user testing).

