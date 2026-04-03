# Modal Components Porting Guide

## Overview
5 modal components have been created in `/src/modals/` that replace the vanilla HTML stub implementations. All logic from `workspace.html` modals has been ported to React with TypeScript.

## Components Created

### 1. CardModal.tsx
**Source:** workspace.html line 3960-3997 (renderCardModal)
**Purpose:** Projects block - edit task cards

**Form Fields:**
- Card title (text input)
- Description (textarea, 3 rows)
- Steps list (with checkbox, inline text edit, delete button)
- Step progress counter
- Add-step input with Enter key support
- Tag toggles (3 predefined tags)

**Data Storage:**
- Reads/writes to `projectBoard` global store key
- Loads from: `loadJSON("projectBoard", {})`
- Saves to: `saveJSON("projectBoard", data)`

**State Variables:**
```typescript
cardTitle, cardDesc, steps, checks (Set), newStepInput, tags (Set)
```

### 2. ThreadsIntelModal.tsx
**Source:** workspace.html line 5552-5681 (openThreadsIntelModal)
**Purpose:** Threads Intel block - record account analysis

**Form Sections:**
1. Basic Info (name, handle, URL)
2. 3-Condition Filter (3 checkboxes with rejection reason fallback)
3. Account Analysis (4 text inputs)
4. Comment Decision (radio choice + reason + conditional textareas)
5. Brand Pain Tags (9 buttons + custom tag input)
6. Blindspot Log (2 textareas + repeat counter)

**Conditional Rendering:**
- Rejection reason shown only if any filter unchecked
- Core Point + Comment Draft shown only if decision === "comment"

**Data Storage:**
- Reads/writes to `threads-intel-records` global key
- Array of ThreadsIntelRecord objects with nested analysis/comment/blindspot structures

### 3. PromptedNotesModal.tsx
**Source:** workspace.html line 5400-5446 (openPromptedNotesModal)
**Purpose:** Prompted Notes block - custom prompt templates and entry recording

**Two Modes:**
- **config**: Define prompt fields (label, type text/textarea), add/remove fields
- **entry**: Fill out responses based on config, can edit or create new

**Dynamic Rendering:**
- Entry fields generated from config on mount
- Input type (text vs textarea) determined by config.type
- Delete button appears only in entry edit mode

**Data Storage:**
- Config: `prompted-notes-config:{blockId}`
- Entries: `prompted-notes-entries:{blockId}`
- Each entry has { id, blockId, date, timestamp, fields: {key: value} }

### 4. SpotifyPresetModal.tsx
**Source:** workspace.html line 4526-4550 (openSpotifyPresetModal)
**Purpose:** Spotify block - save and manage playlist presets

**Form Fields:**
- Label input (e.g., "Work", "Rest", "Study")
- URL input (with Spotify link auto-convert)
- Delete button (edit mode only)

**URL Conversion:**
- Helper function `toSpotifyEmbedUrl()` converts any Spotify URL to embed format
- Handles: `spotify.com/playlist/ID` → `open.spotify.com/embed/playlist/ID`

**Data Storage:**
- `spotify-presets:{blockId}` array of { id, label, url }

### 5. ConfirmDialog.tsx
**Source:** workspace.html line 8247-8258 (confirmAction)
**Purpose:** Shared confirmation dialog

**Features:**
- Simple message display
- Dynamic button labels (okLabel, cancelLabel)
- z-index 2000 (higher than other modals)
- Resolves promise with true/false

**Integration:**
```typescript
const result = await useModalStore.getState().openConfirmModal(
  "Are you sure?",
  "Yes",
  "No"
);
```

## Updated Files

### ModalLayer.tsx
**Before:** 220 lines with stub implementations
**After:** 23 lines with clean imports and component renders

All modal state management handled by `useModalStore` from `stores/useModalStore.ts`.

## Integration Points

### Storage
All modals use the same `loadJSON/saveJSON` utilities from `src/utils/storage.ts`.

Storage keys follow patterns:
- Global keys: `projectBoard`, `threads-intel-records`, `spotify-presets:{blockId}`, etc.
- Session keys: `session:{date}:{blockId}:{field}`

### State Management
`useModalStore` (Zustand) provides:
```typescript
openCardModal(cardId, projectBlockId)
closCardModal()
openTiModal(blockId, recordId?)
closeTiModal()
openPnModal(blockId, mode, entryId?)
closePnModal()
openSpotifyModal(blockId, presetId?)
closeSpotifyModal()
openConfirmModal(message, okLabel, cancelLabel) -> Promise<boolean>
closeConfirmModal()
```

## UI Styling
All modals use inline styles matching the vanilla code:
- Backdrop: `rgba(0,0,0,0.5)` with flex centering
- Modal container: white background, 8px border-radius, max-width varies per modal
- Buttons: consistent color scheme (#007AFF primary, #f0f0f0 secondary, #c0392b danger)
- Inputs: 1px #ddd borders, 8px padding, 4px border-radius

## Phase 2 Improvements

### Conditional Rendering Refinement
- ThreadsIntel: Only show "Account Analysis" section if all 3 filters pass
- ThreadsIntel: Only show "Follow-up" section if decision === "comment" AND in edit mode

### Drag & Drop
- CardModal: Add drag-reorder for steps (currently edit/delete only)

### Bilingual Support
- Add `pick()` function calls for all labels (currently hardcoded Chinese)
- Coordinate with language store when available

### Form Validation
- Empty field checks before save
- URL validation for Spotify links
- Required field highlighting

### Block Re-rendering
- After modal close, trigger block re-render in parent block component
- Call block-specific refresh functions (e.g., `rerenderProjectsBlock()`)
- Coordinate timing to avoid state conflicts

## Testing Checklist

- [ ] CardModal: Create/edit card, add/delete steps, toggle tags
- [ ] ThreadsIntelModal: Create record, test filter conditions, toggle pain tags
- [ ] PromptedNotesModal: Create config, add fields, create entry, fill fields
- [ ] SpotifyPresetModal: Add preset, edit URL conversion, delete preset
- [ ] ConfirmDialog: Test OK/Cancel resolution, promise handling
- [ ] Verify localStorage persistence (reload page, data survives)
- [ ] Verify modal backdrop dismiss (click outside to close)
- [ ] Verify all button actions (Save, Cancel, Delete)

## File Locations
```
src/
├── components/ModalLayer.tsx (updated)
├── modals/ (new directory)
│   ├── CardModal.tsx
│   ├── ThreadsIntelModal.tsx
│   ├── PromptedNotesModal.tsx
│   ├── SpotifyPresetModal.tsx
│   └── ConfirmDialog.tsx
├── stores/useModalStore.ts (already exists)
├── utils/storage.ts (already exists)
└── hooks/useBlockField.ts (already exists)
```

## Notes
- Type annotations included for all data structures
- Comments mark areas for future enhancement
- All logic is self-contained in modal files
- No modifications to App, BlockRegistry, Canvas, or other core components
- Storage contract unchanged (same global keys as vanilla code)
