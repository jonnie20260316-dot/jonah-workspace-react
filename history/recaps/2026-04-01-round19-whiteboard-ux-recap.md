# Session Recap — 2026-04-01: Round 19 — Whiteboard UX + Sidebar Upgrades

**Requested by:** User
**Executed by:** Claude Code (Sonnet 4.6)
**Wrap-up written by:** Claude Code (Sonnet 4.6)

## What Was Worked On

A large UX/design session focused on making the workspace feel like a real borderless whiteboard, upgrading the sticky and content blocks, and shipping a full suite of sidebar improvements.

---

## What Shipped

### 1. Block History Panel Bug Fixes
Three bugs squashed before the main feature work:
- **Missing block types:** `SIDEBAR_TYPES` now includes all 17 types (was missing threads-intel, prompted-notes, timer, etc.). 6 new filter icon buttons added.
- **Panel closing on click:** Outside-click handler added `e.target.isConnected &&` check — `renderHistorySidebar()` replaces innerHTML which detaches the click target; old code falsely triggered close.
- **Timer missing from Add Block menu:** Added `"timer"` to `addableTypes`.

### 2. Truly Infinite Canvas
- **Board size:** 5200×3400 → **20000×15000** px. CSS + JS + auto-migration for old saved values.
- **Pan clamp fix:** `getViewportBounds()` rewritten — old formula produced negative `maxY` at zoom < ~0.14, making pan stick at top. New formula uses `Math.max(minX/minY, ...)` guard.
- **Scale-aware panning:** Pan handler now divides mouse delta by `viewportState.scale`. Panning at 30% zoom no longer feels sluggish.
- **VIEWPORT_PADDING:** 600 → 2400 (breathing room at canvas edges).

### 3. Sticky & Content Blocks — Borderless Writing Surfaces
Both blocks converted from "form in a card" to content-first floating notes:
- Removed `surface-card` wrappers and `field-label` elements
- `textarea` → `div[contenteditable="true"]` with class `rich-body`
- `data-store` binding extended to handle contenteditable (`.innerHTML` vs `.value`)
- Plain text migration: existing newlines → `<br>` on load
- Paste handler strips HTML (plain text only)
- `::placeholder` → `:empty::before { content: attr(data-placeholder) }`

### 4. Feature A — Sidebar Search Bar
- Static `<input id="historySearchInput">` in panel header
- `historySearchQuery` module-level state; bound in `bindChromeEvents()`
- Flat search across all `SIDEBAR_TYPES`: matches type name / date / entry label
- Renders `.search-result-list` with `.search-type-chip` + label + date
- Clear button resets and refocuses

### 5. Feature C — Compact Mode Toggle
- `≡` toggle button in panel header
- `historyCompact` persisted as `"history-compact"` in `GLOBAL_KEYS`
- CSS overrides for `.compact-mode` on `#historyCategories`: smaller padding, font sizes, gaps
- Button gets `.active` class to show state

### 6. Feature D — Rich Text Formatting
- Floating dark-pill format bar (`#richFormatBar`) positioned above selection
- `selectionchange` listener: shows/hides bar based on whether selection is inside `.rich-body`
- Buttons use `mousedown` + `e.preventDefault()` to preserve contenteditable focus
- ⌘B → bold, ⌘I → italic, ⌘⇧H → toggle h3/div
- Active state detection for each button
- Typography CSS: `h3`, `strong`, `em`, `p` rules for `.sticky-area` / `.content-body`

### 7. Feature E — Draft History for Content Blocks
- **Snapshot on Save:** every content block's title + body snapshotted. Deduplicates against last entry. Max 20 versions.
- **Storage:** `content-draft-history:{blockId}` — added to `GLOBAL_KEY_PREFIXES`
- **UI:** "草稿記錄 (N)" toggle button appears at block footer when history exists
- **History panel:** scrollable list, newest first, showing title + `formatTimestamp()` display
- **Restore:** click "還原" → writes title + body to storage + `touchEdited()` + `rerenderBlock()`
- `contentDraftHistoryOpen` Set tracks open panels
- `formatTimestamp(ts)` helper added (`YYYY-MM-DD HH:MM`)

### 8. Feature B — Sidebar Category Drag Reorder
- `⠿` drag handle on each category row (visible on hover only)
- Each `.history-category` div is `draggable="true"` with `data-drag-cat` attribute
- `sidebarCategoryOrder` array: loaded from `"sidebar-category-order"` (GLOBAL_KEYS), merged with `SIDEBAR_TYPES` to catch new types
- `getFilteredTypes()` now uses `sidebarCategoryOrder` instead of raw `SIDEBAR_TYPES`
- Drop → splice reorder → `saveJSON` → `renderHistorySidebar()`
- CSS: `.cat-drag-handle`, `.cat-dragging` (opacity 0.4), `.cat-drag-over` (blue outline on target)
- `sidebarDragType` module-level state tracks drag source

---

## New Storage Keys Added

| Key | Type | Notes |
|-----|------|-------|
| `history-compact` | GLOBAL_KEYS | Compact mode toggle state |
| `sidebar-category-order` | GLOBAL_KEYS | Custom category sort order |
| `content-draft-history:` | GLOBAL_KEY_PREFIXES | Per-block draft version arrays |

---

## Files Changed

| File | Change |
|------|--------|
| `workspace.html` | ~8000+ lines — all changes in-place via Edit |

---

## Lessons Locked

No mistakes in this session. All edits succeeded on first attempt. The `e.target.isConnected &&` outside-click fix and the getViewportBounds() rewrite were both diagnosed cleanly from root causes.

---

## Status

✅ **Round 19 complete.** Whiteboard UX overhaul, borderless blocks, 5 sidebar features, draft history — all shipped.
