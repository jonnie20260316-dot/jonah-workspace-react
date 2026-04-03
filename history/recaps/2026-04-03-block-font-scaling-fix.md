# Session Recap — 2026-04-03: Block Font Scaling Fix

**Requested by:** User
**Executed by:** Claude Code
**Wrap-up written by:** Claude Code

---

## What was worked on

Two-session arc to make block content scale when Opt+dragging a corner or changing the global font size in Gear menu.

### Session 1 (previous): Infrastructure laid
- Added `textScale?: number` to `Block` type in `types.ts`
- `useBlockResize.ts` — Opt+drag (`e.altKey`) symmetric resize math + per-block textScale computation
- `BlockShell.tsx` — inline `--text-scale` CSS var override on the block article element
- `workspace.css` — `.board-block { font-size: calc(13px * var(--text-scale)) }` root anchor; converted 6 child font-size rules from `calc(Xpx * var(--text-scale))` to `em`; fixed `.block-body label` which was hardcoded at `10px`

### Session 2 (this session): Root cause audit + fix

**Diagnosis:** All the CSS work was correct, but the feature still didn't work. Root cause: **154 inline `style={{ fontSize: "Xpx" }}` in JSX across 15 block component files override all CSS rules** — inline styles always win over class selectors. So `--text-scale` and the `em` cascade were invisible to almost all block content.

**Fix:** In all 15 block files (NOT modals — they're outside `.board-block`), changed every:
```
fontSize: "12px"  →  fontSize: "calc(12px * var(--text-scale))"
```

`var(--text-scale)` in a JSX inline style resolves via CSS cascade — picks up per-block Opt+drag value on `.board-block`, or falls back to global Gear menu value on `:root`.

**Files changed (15 block components):**
- SwipeBlock.tsx (28 occurrences)
- VideoCaptureBlock.tsx (19 occurrences)
- ThreadsIntelBlock.tsx (18 occurrences)
- JournalBlock.tsx (14 occurrences)
- PromptedNotesBlock.tsx (11 occurrences)
- TasksBlock.tsx (10 occurrences)
- IntelBlock.tsx (10 occurrences)
- KitBlock.tsx (8 occurrences)
- ProjectsBlock.tsx (7 occurrences)
- VideoBlock.tsx (6 occurrences)
- SpotifyBlock.tsx (4 occurrences)
- DashboardBlock.tsx (4 occurrences)
- ContentBlock.tsx (3 occurrences)
- IntentionBlock.tsx (3 occurrences)
- ThreadsBlock.tsx (2 occurrences)

**Modals left unchanged:** CardModal, PromptedNotesModal, SpotifyPresetModal, ThreadsIntelModal — these render outside `.board-block` so absolute `px` is correct.

---

## What shipped

- Opt+drag a block corner while holding Alt → ALL text inside the block scales: inputs, labels, textareas, buttons, section headings, stats
- Global text scale (Gear menu) now works for all block content, not just CSS-ruled elements
- Build: 1791 modules, 0 TS errors ✓
- At scale 1.0 the visual output is identical to before (calc(Xpx × 1) = Xpx)

---

## Lessons Locked

**JW-33: Inline Style Specificity Trap**

When CSS class rules don't appear to work, check if inline styles on the same element are silently winning. In React, any `style={{ fontSize: "12px" }}` on an element beats `.block-body input { font-size: 1em }` — no cascade, no override short of `!important`. The fix is to make inline styles reference the same CSS variable: `fontSize: "calc(12px * var(--text-scale))"`.

**Pattern to remember:** When rolling out a CSS custom property for scaling, grep for inline `fontSize` in the same component tree. They will silently override.

---

## Still pending

- Visual verification (JW-16) — Playwright environment not available; manual browser test recommended
- Modals (CardModal etc.) don't scale with block — acceptable, they're global overlays
