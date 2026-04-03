# Timer Block — Visual Design Specification
## Version 1.0 — 2026-04-02

Design language: "Apple Notes meets Linear meets Notion — warm, tactile, precise, breathing."
Token source: `src/styles/tokens.css`. All measurements in logical pixels (1x).

---

## 0. Governing Decisions

### SVG vs CSS conic-gradient for the ring

**Decision: SVG with `stroke-dasharray` / `stroke-dashoffset`.**

Rationale:
- The timer re-renders every second. A CSS conic-gradient ring requires writing a new inline `background` string on every tick, which triggers a full style recalculation for that subtree. SVG `stroke-dashoffset` is a presentation attribute — React can update it via a ref (or a single attribute change) without triggering React's reconciler at all if you use `useEffect` + direct attribute mutation.
- SVG gives sub-pixel crisp anti-aliasing on retina. CSS conic-gradient rings show visible stepping artifacts below ~40px ring width on non-retina.
- SVG allows independent `stroke-linecap`, `stroke-opacity`, and `filter` per ring layer. CSS conic-gradient cannot layer a soft glow behind the fill without extra DOM.
- SVG `<circle>` stroke is naturally centered on the path — no `calc()` tricks needed for inner/outer radius alignment.

**Implementation contract:** The SVG updates via a `useEffect` that writes directly to a `ref.current` attribute — it does NOT call `setTimerState`. The Zustand tick drives visual sync via the existing `timerState` selector only.

---

## 1. Circular Timer Progress Ring

### 1.1 Geometry

| Property | Value | Derivation |
|---|---|---|
| Component outer size | 200 × 200 px | Constrained by default block width 400px: ring sits 100px from left edge with 24px body padding on each side, centering it in a 400px block cleanly. |
| SVG viewBox | `0 0 200 200` | 1:1 with logical px |
| Center | cx=100, cy=100 | |
| Track radius (r) | 82 px | Gives 12px gap from SVG edge, so the stroke stays inside the viewBox |
| Stroke width — track | 10 px | |
| Stroke width — fill | 10 px | Same as track; they share the same path |
| Stroke width — glow layer | 14 px | Behind fill, blurred; creates halo effect |
| Circumference | 2 × π × 82 = 515.22 px | Used to compute dasharray |
| Inner face diameter | (82 − 5) × 2 = 154 px | Radius minus half stroke-width, doubled |

### 1.2 Layer Stack (bottom to top)

```
Layer 0: SVG background circle (fills inner face area — optional frosted fill)
Layer 1: Track circle     — full ring, static
Layer 2: Glow circle      — same arc as fill, blurred, semi-transparent
Layer 3: Fill circle      — animating stroke-dashoffset
Layer 4: Foreign object or absolutely positioned div — text face
```

### 1.3 Track Circle

```
stroke:         rgba(36, 50, 49, 0.08)   /* --line at slightly higher opacity */
stroke-width:   10px
fill:           none
stroke-linecap: butt
rotation:       -90deg (transform-origin: 50% 50%) so progress starts at 12 o'clock
```

### 1.4 Fill Circle — State Colors

| State | stroke color | glow color |
|---|---|---|
| Idle / Ready | rgba(36, 50, 49, 0.08) — same as track (invisible fill) | none |
| Running — Work | var(--accent) = #1f786f | rgba(31, 120, 111, 0.28) |
| Running — Rest | var(--gold) = #bc7542 | rgba(188, 117, 66, 0.28) |
| Overtime | var(--danger) = #c0392b | rgba(192, 57, 43, 0.32) |
| Complete | var(--accent) = #1f786f | rgba(31, 120, 111, 0.28) |

Fill circle stroke-dasharray: `515.22 515.22`
Fill circle stroke-dashoffset formula:
```
progress = remaining / duration          // 0.0 → 1.0
dashOffset = 515.22 * (1 − progress)    // 0 = full, 515.22 = empty
```
For overtime state: dashOffset = 0 (full ring painted).

stroke-linecap: `round` — gives a clean rounded leading edge.

### 1.5 Glow Layer (performance note)

Apply `filter: blur(4px)` via SVG `<feGaussianBlur>` defined in a `<defs>` filter, referenced as `filter="url(#ringGlow)"`. Do NOT use CSS `filter: blur()` on the SVG element — that would trigger a GPU layer promotion for the entire SVG every tick. The SVG filter is rasterized within the SVG compositor.

### 1.6 Transition Specs

| Change | Duration | Easing |
|---|---|---|
| Stroke color change (state switch) | 260ms | var(--ease-standard) |
| DashOffset per-tick | none — direct attribute write | n/a |
| Initial fill in from idle | 400ms | var(--ease-enter) on first play |

Transition the SVG `stroke` attribute via CSS:
```css
.timer-fill-circle {
  transition: stroke 260ms var(--ease-standard);
}
```
DashOffset must NOT be transitioned — it would create a rubber-band effect on 1-sec ticks. Write it synchronously in the requestAnimationFrame callback inside useEffect.

### 1.7 Inner Face Typography

The face is a flex column centered inside the SVG using a `<foreignObject>` at x=23, y=23, width=154, height=154 (aligning to the inner face diameter). It contains a single centered `<div>`.

**Time display:**
```
font-family:    var(--font-body)
font-size:      38px (work/rest idle), 32px (overtime — needs room for +prefix)
font-weight:    200
font-variant-numeric: tabular-nums
letter-spacing: 0.02em
line-height:    1
color:          see state table below
```

**State → time color:**
| State | color |
|---|---|
| Idle | var(--text-secondary) = #64706d |
| Running Work | var(--accent) = #1f786f |
| Running Rest | var(--gold) = #bc7542 |
| Overtime | var(--danger) = #c0392b |
| Complete | var(--accent) = #1f786f |

Transition: `color 260ms var(--ease-standard)` on the time span.

**Overtime prefix "+":**
```
font-size:      20px
vertical-align: middle
margin-right:   2px
color:          inherits var(--danger)
```

**State label (below time):**
```
font-family:    var(--font-body)
font-size:      10px
font-weight:    500
color:          var(--text-tertiary) = #9a918a
text-transform: uppercase
letter-spacing: 0.07em
margin-top:     6px
```

Label strings by state:
| State | Chinese (default) | English |
|---|---|---|
| Idle | 就緒 | READY |
| Running Work | 深度工作 | DEEP WORK |
| Running Rest | 休息 | REST |
| Overtime | 超時 | OVERTIME |
| Complete | 完成了 | DONE |

### 1.8 Overtime Pulse Animation

When state = overtime, add a pulsing ring outside the main fill ring:

```css
@keyframes timerOvertimePulse {
  0%   { stroke-opacity: 0.6; stroke-width: 10; r: 82; }
  100% { stroke-opacity: 0;   stroke-width: 1;  r: 92; }
}
```

This is a separate `<circle>` element, stroke var(--danger), no fill, `animation: timerOvertimePulse 1.4s var(--ease-standard) infinite`.

### 1.9 Complete State

When overtime = 0 and remaining = 0 and running was just stopped (mode becomes "complete"), show a brief completion animation:

```css
@keyframes timerComplete {
  0%   { transform: scale(0.96); opacity: 0.7; }
  50%  { transform: scale(1.04); opacity: 1; }
  100% { transform: scale(1.00); opacity: 1; }
}
.timer-ring-complete {
  animation: timerComplete 480ms var(--ease-spring) forwards;
}
```

Apply class to the SVG element for 480ms, then remove.

### 1.10 Accessibility

- SVG has `role="img"` and `aria-label` updated every tick: `aria-label="計時器：剩餘 MM 分 SS 秒"` (or English equivalent via `pick()`)
- The foreignObject time display is `aria-live="off"` — screen readers should use the SVG label only, not announce every second
- Focus ring on the SVG parent div: `outline: 2px solid var(--accent); outline-offset: 4px`

---

## 2. Daily Focus Stats Section

Positioned below the ring, inside the same `block-body` padding context.

### 2.1 Target Progress Bar

Full-width bar between the ring and the stat cards.

**Bar container:**
```
height:         6px
width:          100%
margin-top:     16px
margin-bottom:  12px
background:     rgba(36, 50, 49, 0.08)   /* track */
border-radius:  var(--radius-pill) = 9999px
overflow:       hidden
```

**Fill:**
```
height:         100%
border-radius:  var(--radius-pill)
transition:     width 600ms var(--ease-standard)
```

Fill gradient — Normal (under daily target):
```
background: linear-gradient(90deg, var(--accent) 0%, #2a9d8f 100%)
/* #2a9d8f is a brighter teal, giving a sense of depth */
```

Fill gradient — Exceeded (over daily target):
```
background: linear-gradient(90deg, var(--gold) 0%, #e8956b 100%)
/* warm celebration gradient */
```

Fill width calculation:
```
width: min(100%, (minutesToday / dailyTarget) * 100) + "%"
```

**Label above bar (right-aligned, tiny):**
```
font-size:      10px
color:          var(--text-tertiary)
margin-bottom:  4px
text-align:     right
letter-spacing: 0.04em
```
Text: `MM / TT 分` where MM = minutes today, TT = daily target.
When exceeded: text switches to var(--gold), shows `+NN 分 超過目標`.

### 2.2 Stat Cards Row

Three cards in `display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px`.

**Card container:**
```
background:     var(--surface-1) = rgba(255, 250, 243, 0.95)
border:         1px solid var(--line) = rgba(36, 50, 49, 0.12)
border-radius:  var(--radius-sm) = 6px
padding:        10px 8px
text-align:     center
```

No hover effect — these are read-only display.

**Number (top line):**
```
font-family:    var(--font-body)
font-size:      22px
font-weight:    300
font-variant-numeric: tabular-nums
letter-spacing: 0.01em
line-height:    1
color:          var(--ink) = #243231
```
Exception: when value = 0, color → var(--text-tertiary).

**Label (bottom line):**
```
font-family:    var(--font-body)
font-size:      10px
font-weight:    500
color:          var(--text-tertiary) = #9a918a
text-transform: uppercase (removed for Chinese — keep sentence case)
letter-spacing: 0.05em
margin-top:     4px
line-height:    1.3
```

**Card definitions:**
| Index | Number | Label ZH | Label EN | Color when nonzero |
|---|---|---|---|---|
| 0 | total minutes today | 分鐘 | MIN | var(--ink) |
| 1 | session count today | 工作階段 | SESSIONS | var(--ink) |
| 2 | average minutes per session | 平均 | AVG | var(--ink) |

### 2.3 Session Log Expandable Section

**Toggle button:**
```
display:        flex
align-items:    center
gap:            4px
width:          100%
margin-top:     10px
padding:        6px 0
border:         none
background:     none
cursor:         pointer
font-size:      11px
color:          var(--text-tertiary)
text-align:     left
border-top:     1px solid var(--line)
transition:     color var(--dur-instant) var(--ease-standard)
```
Hover: color → var(--ink).
Left side: chevron icon (ChevronDown / ChevronRight, 12px, Lucide), rotates 90deg on open.
Right side: session count badge (small pill).

**Badge:**
```
font-size:      10px
padding:        1px 6px
background:     var(--accent-soft) = rgba(31, 120, 111, 0.12)
color:          var(--accent) = #1f786f
border-radius:  var(--radius-pill)
font-weight:    600
```

**Session log panel (when expanded):**
```
margin-top:     4px
max-height:     160px
overflow-y:     auto
display:        flex
flex-direction: column
gap:            2px
```
Entry animation: `fabPickerIn 180ms var(--ease-spring)` on expand.

**Session row:**
```
display:        flex
align-items:    center
padding:        5px 8px
border-radius:  var(--radius-sm) = 6px
background:     transparent
font-size:      12px
```
Hover: `background: rgba(36, 50, 49, 0.04)`.

Row layout: `[mode dot] [start time] [gap: auto] [duration] [end time]`

Mode dot: 6px circle, var(--accent) for work, var(--gold) for rest.
Start/end time: font-size 11px, color var(--text-secondary), font-variant-numeric tabular-nums.
Duration: font-size 12px, font-weight 600, color var(--ink).

### 2.4 Accessibility — Stats Section

- Progress bar: `role="progressbar" aria-valuenow={minutesToday} aria-valuemin={0} aria-valuemax={dailyTarget} aria-label="今日專注進度"`
- Stat cards: each has `aria-label` like `"今日 42 分鐘"` (computed, not just the visual number)
- Session log toggle button: `aria-expanded={open}`, `aria-controls="session-log-panel"`
- Session log panel: `id="session-log-panel"`, `role="list"`, each row is `role="listitem"`

---

## 3. Calendar Date Picker Modal

### 3.1 Trigger and Position

The DateNav pill in the FloatingTopBar (currently plain text + arrows) gains a click handler that opens the calendar. The calendar attaches below the pill.

**Positioning strategy:**
```
position:       absolute   (relative to FloatingTopBar container)
top:            calc(100% + 8px)
left:           50%
transform:      translateX(-50%)
z-index:        400   (above top bar z=200, below modal layer z=500)
```

Important: no `position: fixed`. The top bar itself is fixed at the top; the calendar uses absolute positioning inside the bar, which is effectively fixed. This avoids any scroll offset issue and correctly anchors to the pill center.

### 3.2 Panel Geometry

```
width:          280px
background:     var(--surface-1) = rgba(255, 250, 243, 0.95)
backdrop-filter: blur(20px) saturate(160%)
border:         1px solid var(--line)
border-radius:  var(--radius-lg) = 18px
padding:        16px
box-shadow:     var(--shadow-modal)
transform-origin: top center
```

### 3.3 Month Header

```
display:        flex
align-items:    center
justify-content: space-between
margin-bottom:  12px
```

**Month/year label:**
```
font-family:    var(--font-display) = Songti TC
font-size:      15px
font-weight:    600
color:          var(--ink) = #243231
letter-spacing: 0.01em
```
Format ZH: `2026年 4月` | Format EN: `April 2026`

**Navigation arrows (prev/next month):**
```
width:          28px
height:         28px
border-radius:  var(--radius-sm) = 6px
border:         none
background:     none
cursor:         pointer
color:          var(--text-secondary)
font-size:      18px
line-height:    1
display:        flex
align-items:    center
justify-content: center
transition:     background var(--dur-instant), color var(--dur-instant)
```
Hover: `background: rgba(36, 50, 49, 0.06); color: var(--ink)`.
Use Lucide `ChevronLeft` / `ChevronRight` at 16px.

### 3.4 Day Name Row

Seven columns above the date grid.

```
display:        grid
grid-template-columns: repeat(7, 1fr)
margin-bottom:  6px
```

**Day name cell:**
```
text-align:     center
font-size:      10px
font-weight:    600
color:          var(--text-tertiary) = #9a918a
letter-spacing: 0.05em
padding-bottom: 4px
```

Day name strings ZH: `日 一 二 三 四 五 六` (Sunday first)
Day name strings EN: `Su Mo Tu We Th Fr Sa`

Sunday and Saturday: color → rgba(192, 57, 43, 0.55) — subtle clay-red to distinguish weekend without shouting.

### 3.5 Date Grid

```
display:        grid
grid-template-columns: repeat(7, 1fr)
gap:            2px
```

**Date cell — base:**
```
position:       relative
width:          100%
aspect-ratio:   1 / 1
display:        flex
flex-direction: column
align-items:    center
justify-content: center
border-radius:  var(--radius-sm) = 6px
cursor:         pointer
border:         none
background:     none
font-size:      13px
font-weight:    400
color:          var(--ink)
transition:     background var(--dur-instant), color var(--dur-instant)
```

Hover (no special state): `background: rgba(36, 50, 49, 0.06)`.

**State modifiers:**

Empty/padding cell (days outside current month):
```
color:          var(--text-placeholder) = #c0b8b0
cursor:         default
pointer-events: none
```

Today (not selected):
```
color:          var(--accent) = #1f786f
font-weight:    700
```
Plus a small underline dot:
```
::after {
  content: '';
  position: absolute;
  bottom: 3px;
  width: 4px; height: 4px;
  border-radius: 50%;
  background: var(--accent);
}
```

Selected (active date):
```
background:     var(--ink) = #243231
color:          var(--text-inverted) = #fefdf9
font-weight:    600
```
Remove the today dot when selected.

Today + selected simultaneously (viewing today):
```
background:     var(--accent) = #1f786f
color:          var(--text-inverted) = #fefdf9
font-weight:    700
```

Has-data indicator (date has journal/session entries):
```
/* A slightly different dot below the number — 3px, softer */
::before {
  content: '';
  position: absolute;
  bottom: 4px;
  width: 3px; height: 3px;
  border-radius: 50%;
  background: var(--text-tertiary);
  opacity: 0.6;
}
```
The has-data dot is suppressed when the cell shows the today dot or is selected (visual priority order: selected > today-dot > has-data).

### 3.6 Entry Animation

```css
@keyframes calendarEnter {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-8px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}
@keyframes calendarExit {
  from {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateX(-50%) translateY(-6px) scale(0.96);
  }
}
```

Note: `translateX(-50%)` must be preserved in keyframes because it is part of the centering transform — do not separate it.

Entry: `calendarEnter 220ms var(--ease-spring) forwards`
Exit: `calendarExit 160ms var(--ease-exit) forwards`

Use a CSS class toggle with a mounted/unmounting state pattern in React (add `.is-exiting` class, wait 160ms, then remove from DOM).

### 3.7 Interaction Behaviour

1. Click date → `setActiveDate(isoString)` → modal closes immediately (no delay).
2. Click prev/next month arrow → updates displayed month (does NOT change active date or close modal).
3. Click outside the modal (backdrop) → closes modal. Use a `mousedown` listener on `document` that checks if the click target is outside the modal ref.
4. Press `Escape` → closes modal.
5. Month navigation wraps correctly: clicking prev on January goes to December of the previous year.

### 3.8 Accessibility

- Panel: `role="dialog"` `aria-label={pick("選擇日期", "Choose date")}` `aria-modal="true"`
- Focused on open: first non-disabled date cell, or the selected date cell.
- Day cells: `role="gridcell"` `aria-selected` `aria-label` with full date string: `"2026年4月15日"` / `"April 15, 2026"`
- Navigation buttons: `aria-label={pick("上個月", "Previous month")}` / `aria-label={pick("下個月", "Next month")}`
- Grid wrapper: `role="grid"` `aria-label={pick("日期選擇器", "Date picker")}`
- Keyboard: Arrow keys move focus within grid. Enter/Space selects. Tab exits.

---

## 4. Timer Settings Panel

### 4.1 Trigger

A small gear icon button in the TimerBlock header, appended to the existing `block-actions` row. Uses Lucide `Settings` at 14px. Same style as `.block-actions button`.

### 4.2 Panel Layout

Slides down from the block header — appears just below the header bar, occupying the full block width, layered on top of the normal block body content.

**Panel shell:**
```
position:       absolute
top:            100%   /* relative to block-head */
left:           0
right:          0
z-index:        50     /* above block-body content, inside the block stacking context */
background:     var(--surface-1) = rgba(255, 250, 243, 0.95)
backdrop-filter: blur(16px) saturate(140%)
border-top:     1px solid var(--line)
border-bottom:  1px solid var(--line)
padding:        12px 16px
overflow:       hidden
```

**Entry animation:**
```css
@keyframes timerSettingsEnter {
  from { opacity: 0; transform: translateY(-8px); max-height: 0; }
  to   { opacity: 1; transform: translateY(0);    max-height: 400px; }
}
```
Duration: `300ms var(--ease-enter)`.

This is a slide-down, not a popup. The block body content underneath it is still in DOM but visually pushed down/overlapped. The panel closes on the same gear icon click (toggle) or clicking outside.

### 4.3 Section Pattern — Apple Settings Style

Each settings group follows this visual pattern:

```
Section label (uppercase, small, tertiary):
┌─────────────────────────────────────┐
│ Row 1                               │
├─────────────────────────────────────┤
│ Row 2                               │
└─────────────────────────────────────┘
```

**Section container:**
```
margin-bottom:  12px
```

**Section label:**
```
font-size:      10px
font-weight:    700
color:          var(--text-tertiary) = #9a918a
text-transform: uppercase
letter-spacing: 0.07em
margin-bottom:  4px
padding-left:   2px
```

**Section group box:**
```
background:     var(--surface-raised) = #fff
border:         1px solid var(--line)
border-radius:  var(--radius-sm) = 6px
overflow:       hidden
```

**Row inside group:**
```
display:        flex
align-items:    center
padding:        8px 10px
min-height:     36px
border-bottom:  1px solid var(--line)   /* except last row */
```
Last row of group: `border-bottom: none`.

**Row label:**
```
font-size:      12px
color:          var(--ink)
flex:           1
```

**Row control (right side):**
varies by type — see 4.4–4.7.

### 4.4 Section: Daily Goal (每日目標)

Single row: label + number input + unit label.

**Number input:**
```
width:          56px
text-align:     center
font-size:      13px
font-weight:    500
font-variant-numeric: tabular-nums
border:         1px solid var(--line)
border-radius:  var(--radius-sm)
padding:        3px 6px
background:     var(--surface-1)
color:          var(--ink)
```
Focus: border-color → var(--accent), box-shadow → `0 0 0 3px var(--accent-soft)`.

**Unit label** (right of input, inside the row):
```
font-size:      11px
color:          var(--text-secondary)
margin-left:    4px
```
Text: `分鐘 / Min`

### 4.5 Section: Time's Up (時間到)

Two rows:
1. "到時行為" → `<select>` for behavior: 繼續計時(超時) / 暫停 / 重置
2. "系統通知" → toggle switch (On/Off)

**Select dropdown:**
```
font-size:      12px
border:         1px solid var(--line)
border-radius:  var(--radius-sm)
padding:        3px 8px 3px 6px
background:     var(--surface-1)
color:          var(--ink)
cursor:         pointer
```
Use the system `<select>` element — do not build a custom dropdown. System select inherits OS accessibility and respects Dark Mode when/if the design adds it.

**Toggle switch (for notifications):**
Dimensions: 32px wide × 18px tall.
```
border-radius:  9px (= half of height)
background:     var(--text-placeholder) when off
background:     var(--accent) when on
transition:     background 180ms var(--ease-standard)
cursor:         pointer
position:       relative
```
Knob: 14px circle, white, positioned at left=2 (off) or left=16 (on), `transition: left 180ms var(--ease-spring)`.

This is a custom `<button role="switch">` with `aria-checked`. Do NOT use `<input type="checkbox">` with CSS — the accessible name is harder to wire without a visible label element.

### 4.6 Section: Alarm Sound (鬧鈴音效)

List of sound options. Scrollable area: `max-height: 120px; overflow-y: auto`.

**Sound row:**
```
display:        flex
align-items:    center
gap:            8px
padding:        6px 10px
cursor:         pointer
transition:     background var(--dur-instant)
```
Hover: `background: rgba(36, 50, 49, 0.04)`.

Row elements (left to right):
1. Play button — 24px × 24px circle button, background var(--accent-soft), icon Lucide `Play` at 12px, color var(--accent). While playing: icon switches to `Square` (stop), background var(--accent), icon color white.
2. Sound name — font-size 12px, color var(--ink), flex: 1, truncate with ellipsis if long.
3. Checkmark — Lucide `Check` at 14px, color var(--accent), visible only when this sound is `selectedSound`. Hidden otherwise (not just transparent — set `visibility: hidden` to preserve layout column width).

Sound name for the built-in bell: `系統鈴聲` / `Bell`
Custom sounds: filename without extension, max 24 chars, ellipsis for overflow.

**Upload button** (below the list, inside the section box as the final row):
```
width:          100%
padding:        7px 10px
text-align:     center
font-size:      11px
font-weight:    500
color:          var(--text-secondary)
border:         none
border-top:     1px solid var(--line)
background:     none
cursor:         pointer
transition:     color var(--dur-instant), background var(--dur-instant)
```
Hover: `background: rgba(36, 50, 49, 0.04); color: var(--ink)`.
Left side icon: Lucide `Upload` at 12px.
Text ZH: `上傳音效` | EN: `Upload sound`

### 4.7 Section: Presets (快速預設)

Two sub-rows within the group:
- "專注" → horizontal chip row of preset minutes: 15, 30, 45, 60, 90
- "休息" → horizontal chip row: 5, 10, 15, 20, 30

This is NOT for setting the active duration — it is for customizing which presets appear in the TimerBlock preset button row. Display it as read-only chips showing the current preset list.

**Preset chip:**
```
font-size:      11px
padding:        2px 8px
border-radius:  var(--radius-pill)
border:         1px solid var(--line)
background:     var(--surface-1)
color:          var(--text-secondary)
```

Note: Full custom preset editing (add/remove presets) is a future feature. In the current spec, this section is display-only with a label explaining the defaults.

### 4.8 Panel Footer

```
padding:        8px 0 0 0
border-top:     1px solid var(--line)
margin-top:     8px
text-align:     right
```

"完成" / "Done" button:
```
font-size:      12px
font-weight:    500
padding:        5px 14px
border-radius:  var(--radius-sm)
border:         none
background:     var(--ink) = #243231
color:          var(--text-inverted) = #fefdf9
cursor:         pointer
transition:     background var(--dur-instant)
```
Hover: `background: var(--accent-deep) = #0f4b44`.

### 4.9 Accessibility — Settings Panel

- Panel: `role="region"` `aria-label={pick("計時器設定", "Timer settings")}`
- All form controls have visible labels; use `htmlFor` / `id` pairs, not `aria-label` on the control
- Toggle switch: `role="switch"` `aria-checked={value}` `aria-label={pick("系統通知", "Notifications")}`
- Number input: `inputMode="numeric"` `min={15}` `max={480}` `step={15}`
- Select: standard `<label>` + `<select>` association
- Sound play button: `aria-label={pick("試聽 " + name, "Preview " + name)}`
- Close via Escape key (same handler as modal)

---

## 5. Implementation File Map

These spec decisions map to the following files that need changes or creation:

| File | Change |
|---|---|
| `src/blocks/TimerBlock.tsx` | Replace flat time display with SVG ring + foreignObject; add stats section; wire settings panel |
| `src/styles/animations.css` | Add `timerOvertimePulse`, `timerComplete`, `calendarEnter`, `calendarExit`, `timerSettingsEnter` |
| `src/components/DateNav.tsx` | Add click-to-open calendar; add calendar state; render CalendarPicker |
| `src/components/CalendarPicker.tsx` | New component — full calendar modal |
| `src/blocks/TimerSettingsPanel.tsx` | New component — settings panel slide-down |
| `src/stores/useTimerStore.ts` | Add `timerSessions` array to state for session log |
| `src/workspace.css` | Add `.timer-ring-*` classes, `.timer-stats-*`, `.settings-panel-*`, `.calendar-*` |

---

## 6. Sizing Notes for BlockRegistry

The timer block's default size in BlockRegistry.ts is currently `{ w: 400, h: 320 }`.

With the ring (200px) + stats section + session log (collapsed), the minimum content height inside `block-body` is:
```
ring:             200px
gap below ring:    16px
progress bar:      6px + labels ~16px
stat cards:        ~56px
session toggle:    ~32px (collapsed)
────────────────────────
total:            ~326px
```

Plus block header (~44px) and block-body padding (14px top + 14px bottom = 28px):
```
326 + 44 + 28 = 398px minimum
```

Recommended update: `{ w: 400, h: 420 }` — gives comfortable breathing room with the ring centered and stats fully visible without scrolling. Session log expansion adds ~160px more; the block is user-resizable so this is not a hard constraint.

---

## 7. Design Rationale Summary

**Why SVG ring, not CSS conic-gradient?** Performance. 60 state writes per minute × React reconciler cost on conic-gradient background-image recomputation would be measurable on low-end hardware. SVG stroke attribute mutation is compositor-level.

**Why foreignObject for time text?** Keeps all text rendering in the HTML engine (font loading, subpixel rendering, `pick()` calls), while the ring geometry stays in SVG. Avoids SVG `<text>` kerning inconsistencies with Chinese characters.

**Why slide-down panel (not popup) for settings?** The block lives on a canvas and may be near the edge of the viewport. A popup would clip. A slide-down expands the visual boundary of the block naturally and does not fight with canvas positioning.

**Why Apple-style grouped sections?** Matches the established GearMenu pattern already in the codebase (`Section` component in GearMenu.tsx). Consistent visual grammar.

**Why keep system `<select>` for behavior/sound?** Custom dropdowns inside an already-compact panel would add DOM complexity. System selects are accessible by default. The design language tolerates them for non-primary UI.
