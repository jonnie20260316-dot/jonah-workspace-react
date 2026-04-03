# Lessons Locked — 2026-03-24 (Jonah Workspace Session)

## Section 1 — Session Summary

Clean session. No hard errors or rework required. The changes below went in on first attempt.

Work completed:
- Board UX Polish (Lane 1) — hero, layout, viewport defaults
- Hero expanded layout boost
- Floating FAB (add block button, bottom-right)
- Miro-like unlimited zoom + canvas redesign

---

## Section 2 — Non-Obvious Patterns Worth Remembering

### Pattern A: CSS `display: contents` for collapsing nested wrappers into a flat flex row

**Context:** The `.hero.collapsed` state needed to collapse a 2-level nested structure (`.hero-controls > .toolbar-row, .pill-row, .hero-actions`) into a single flat flex row inside `.hero-grid`.

**What works:** Setting `display: contents` on intermediate wrappers makes them "transparent" to layout — their children participate directly in the parent flex container. No HTML restructuring needed.

```css
.hero.collapsed .hero-controls { display: contents; }
.hero.collapsed .toolbar-row,
.hero.collapsed .pill-row,
.hero.collapsed .hero-actions { display: contents; }
```

**Why it's non-obvious:** Most instinct would be to restructure HTML or use JS to move elements. `display: contents` avoids both.

---

### Pattern B: Viewport clamping breaks at extreme zoom-out — adaptive padding required

**Context:** `getViewportBounds` had fixed `VIEWPORT_PADDING = 320`. At `scale = 0.1`, the viewport in board units = `1440 / 0.1 = 14,400`. The canvas is only 5200px wide. So `maxX = max(-320, 5200 - 14400 + 320) = max(-320, -8880) = -320`. And `minX = -320`. Range: zero. The camera was stuck.

**Fix:** Compute `extraX = max(0, (viewport_width_in_board - canvas_width) / 2)` and add it to the padding. This centers the canvas and provides symmetric panning room.

```javascript
const extraX = Math.max(0, (width - boardSize.w) / 2);
const padX = VIEWPORT_PADDING + extraX;
```

**Rule:** Any infinite-canvas viewport clamp must account for the zoom-out case where viewport > canvas. Fixed padding alone will cause the camera to freeze.

---

### Pattern C: Hero h1 — always use `.hero-copy h1` override, not the global `h1` rule

**Context:** The global `h1` had `font-size: clamp(1.9rem, 2.8vw, 3.2rem)` and `max-width: 16ch`. This caused the hero headline to wrap to 5+ lines. Changing the global `h1` would have broken other blocks that use `h1`.

**Fix:** Add a scoped override `.hero-copy h1 { font-size: clamp(1.05rem, 1.55vw, 1.35rem); max-width: 38ch; }`.

**Rule:** In single-file HTML with many block types all using semantic headings, always scope heading size overrides to the specific context rather than touching global rules.

---

## Section 3 — Prevention Rules

**Rule JW-1 (viewport clamping):** Before extending zoom range (MIN_ZOOM or MAX_ZOOM), verify `getViewportBounds` adapts to the new range. Fixed padding fails at extreme zoom-out. Test at target minimum zoom: `width_in_board = viewport_px / min_zoom` — if `width_in_board > canvas_width`, adaptive padding is required.

**Rule JW-2 (scoped CSS in single-file HTML):** When overriding a heading or text size for a specific region, always use a scoped selector (`.context h1`). Never touch the global heading rules. Multiple block types share semantic tags.

**Rule JW-3 (read WORKSPACE-LOG.md first):** At the start of any new Jonah Workspace session, read `/Users/jonnie/jonah-workspace/WORKSPACE-LOG.md` to know the current state before reading workspace.html.

---

## Section 4 — Integration Points

- Rule JW-1 applies whenever zoom constants are changed
- Rule JW-2 applies to any CSS work in workspace.html
- Rule JW-3 applies to any new session working on this project
