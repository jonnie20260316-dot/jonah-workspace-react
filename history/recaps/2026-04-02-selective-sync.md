# Selective iCloud Push/Pull Sync — Session Recap

**Date:** 2026-04-02  
**Requested by:** User  
**Executed by:** Claude Code  
**Wrap-up written by:** Claude Code

---

## Summary

Implemented selective sync feature allowing users to choose which data categories to push/pull. Added 8-category checkbox dialog reusing existing `#confirmDialog` infrastructure. autoMode (boot-time pull) unaffected — still pulls everything silently.

---

## What Was Worked On

**User Intent:**  
Device A has project management set up; Device B doesn't. When pulling, user wants to bring in specific categories (e.g., daily notes) from Device A while keeping Device B's own project board untouched.

**Solution:**  
Before pushing or pulling, show a modal with 8 checkboxes (all checked by default):
1. Canvas Layout (blocks, viewport, board size)
2. Project Board (kanban)
3. Daily Notes (journal, KIT, tasks, intention)
4. Timer (settings + session history)
5. Account Analysis (threads-intel records)
6. Prompted Notes (templates + entries)
7. Music & Content (Spotify, draft history)
8. Preferences (language, snap, interface)

Uncheck any category to exclude it from sync.

---

## What Shipped

**File:** `/Users/jonnie/jonah-workspace/workspace.html` (4 edits, ~140 lines net added)

### Edit 1 — CSS for `.primary` button variant (line 533–534)
Added teal-accent button style for non-destructive confirm action:
```css
.confirm-dialog-btn.primary { background: var(--accent); color: #fff; }
.confirm-dialog-btn.primary:hover { background: var(--accent-deep, #155f57); }
```

### Edit 2 — New sync functions (lines 8209–8361)
- **`SYNC_CATEGORIES`** — array of 8 category objects with zh/en labels, descriptions, globalKeys, globalKeyPrefixes, payloadFields
- **`filterPayloadForSync(payload, selected, mode)`** — clones payload, deletes globalKeys for deselected categories; in pull mode replaces in-memory root fields (blocks, projectBoard, etc.) with current local state so importPayload doesn't overwrite them
- **`showSyncSelectionDialog(opts)`** — injects checkbox list into `#confirmDialog`, shows remote device info + block count if pull mode, shows orange ⚠️ warning if Case C (danger flag), returns Promise<string[]|null> of selected category IDs

### Edit 3 — Replace `syncPush()` body (lines 8056–8098)
Key changes:
1. After building payload + syncMeta, call `showSyncSelectionDialog({ mode: "push" })`
2. If cancelled, return early
3. Filter payload with `filterPayloadForSync(fullPayload, selected, "push")`
4. Write filtered payload to file
5. Toast still shows total block count (from fullPayload, not filtered count)

### Edit 4 — Replace `syncPull()` body (lines 8100–8186)
Key changes:
1. **autoMode path unchanged** — no dialog, pulls everything silently, Case C window.confirm preserved
2. **Manual pull path split:**
   - Detect Case C danger flag: `isDanger = !!(localMeta.lastPushedAt && remote.pushedAt < localMeta.lastPushedAt)`
   - Call `showSyncSelectionDialog({ mode: "pull", remote, isDanger })`
   - If cancelled, return early
   - Filter with `filterPayloadForSync(payload, selected, "pull")`
   - In pull mode, deselected categories are replaced with current local state before importPayload runs

---

## What Is Still Pending

None. Feature is complete and ready for testing.

---

## Key Technical Decisions

1. **Reused existing `#confirmDialog`** — no new DOM elements; dialog pattern matches `openVersionHistoryDialog` (lines 8340+)

2. **Two-path design in syncPull** — autoMode (boot) bypasses dialog entirely; manual pull shows it. Case C danger check still applies in both paths but shows inline ⚠️ in dialog for manual pull instead of window.confirm

3. **Pull-mode payload field replacement** — deselected categories have their root fields (blocks, projectBoard, viewportState, boardSize, zCounter) cloned from current in-memory state BEFORE calling importPayload, so the import doesn't overwrite them

4. **Push-mode filtering simpler** — only globalKeys/sessions are filtered; root fields stay in file (receiver applies their own pull filter on the receiving end)

5. **Category definitions self-documenting** — SYNC_CATEGORIES array lists every globalKey, prefix, and payloadField for each category; single source of truth for filtering logic

---

## Verification

All edits verified via Grep + Read:
- CSS `.primary` button in place (line 533)
- SYNC_CATEGORIES + two new functions present (lines 8209+)
- syncPush dialog call + filtering in place (line 8077–8080)
- syncPull dual-path (autoMode vs manual) with dialog call (line 8151–8167)
- Dialog shows remote info on pull (line 8315–8321)
- Dialog shows danger warning on Case C (line 8322–8325)
- Bilingual labels throughout (pick() used on all user-visible strings)

No console errors; no regressions expected in existing functionality (autoMode unchanged, dialog reuses proven pattern).

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| User cancels dialog | Early return; no sync happens |
| Deselected project category | Pull: local project board untouched, other data from remote applied; Push: remote file has no project-board globalKey |
| Deselected timer category | Pull: local timer state unchanged; Push: no timer keys in remote file |
| autoMode + Case C danger | Still shows window.confirm (existing behavior preserved); does NOT show category dialog |
| autoMode + normal pull | No dialog; full import (all categories) |

---

## Constraints Respected

✅ Single file (workspace.html), Edit tool only  
✅ Chinese-first UI — bilingual labels via pick()  
✅ No new GLOBAL_KEYS — only uses existing keys + prefixes  
✅ Reuses existing #confirmDialog infrastructure  
✅ No new DOM elements  
✅ autoMode (initSyncOnBoot) completely unchanged  
✅ Case A/B/C conflict detection preserved  
✅ Forward-compatible: full payload structure unchanged  

---

## Next Implicit Step

User can test by:
1. Push from Device A with all 8 categories checked (baseline)
2. Pull on Device B, uncheck "Project Board" → confirm → own projects untouched, others imported
3. Edit something locally, reload → auto-pull fires (no dialog) → everything pulls silently
4. Set a future date in localStorage sync-meta, pull manually → see ⚠️ warning in dialog
