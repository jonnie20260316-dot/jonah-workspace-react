# Lessons Locked: 2026-04-03 — CSS Containment & Transformed Ancestors

## Mistake

Attempted to fix calendar popup centering with `position: absolute` + `position: relative` wrapper, but popup appeared clipped on the left and misaligned. Tried twice with same pattern before diagnosing root cause.

## Root Cause

The `FloatingTopBar` component uses `transform: translateX(-50%)` for viewport centering. When a parent element has a CSS `transform` property, it becomes a **containing block** for `position: fixed` descendants. The behavior is:

- `position: absolute` children are positioned relative to the nearest positioned ancestor
- `position: fixed` children inside a transformed ancestor are positioned relative to the transform ancestor, not the viewport
- This makes `left: 50%; transform: translateX(-50%)` calculations break because the 50% reference point is the transformed ancestor's coordinate space, not the viewport

The calendar popup was inside `FloatingTopBar` → it was receiving coordinates relative to the bar's transformed coordinate system → appeared shifted/clipped relative to viewport.

## Prevention Rule

**Rule:** Portal + getBoundingClientRect for Overlays Under Transformed Ancestors

**Trigger:** Any dropdown, tooltip, modal, or overlay component rendered inside or under a parent with CSS `transform`, `perspective`, or `filter` properties.

**Checklist:**
1. Before trying `position: absolute` on an overlay, grep the parent/ancestor chain for `transform:`, `perspective:`, or `filter:`
2. If found, don't use relative/absolute positioning
3. Instead:
   - Add a `ref` to the trigger element
   - Capture `element.getBoundingClientRect()` at trigger time
   - Render overlay via `createPortal(overlay, document.body)`
   - Position with `position: fixed` using `{ top: rect.bottom + gap, left: rect.left + rect.width / 2, ... }`
   - Clamp `left` to viewport bounds: `Math.max(8, Math.min(left, window.innerWidth - overlayWidth - 8))`

**Escape Hatch:** If portal is not feasible (legacy code, framework constraints), move the transformed ancestor outside the component subtree that contains the overlay.

## Integration Points

- Applied: `DateNav.tsx` + `CalendarModal.tsx` in React workspace
- Document in: React workspace architecture guide (when created)
- Watch for: Timer block, any future dropdowns in floating bar

## Historical Context

This is a first-time discovery for this project. Similar issues are common in Figma, Notion, and web frameworks with floating UIs. The pattern is stable and worth remembering.
