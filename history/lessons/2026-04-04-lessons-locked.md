# Lessons Locked — 2026-04-04

**Date:** 2026-04-04
**Sessions:** PiP bug fixes, Electron screen capture, OBS-style switching, Pin HUD, YouTube Studio block
**Severity:** Medium-High (multiple bugs, one process correction by user)

---

## Mistakes Extracted

| # | What | Root Cause | Existing Rule Coverage |
|---|------|-----------|----------------------|
| 1 | PiP position stuck — stale closure in rAF loop | Logic gap | **JW-26** (not followed) |
| 2 | Canvas 0x0 — `display: none` blocks video decoding | Knowledge gap | None |
| 3 | Missing `autoPlay` on hidden video elements | Logic gap | JW-16 would surface it |
| 4 | Electron `getDisplayMedia` needs `setDisplayMediaRequestHandler` | Knowledge gap | None (one-time) |
| 5 | `useSystemPicker: true` not in Electron 41 | Knowledge gap | None (one-time) |
| 6 | `sources[0]` = app window, not screen | Logic gap | JW-16 would surface it |
| 7 | Started coding multi-file feature without plan | Process gap | CLAUDE.md guidance exists but wasn't enforced |
| 8 | Opt+drag resize missing `/scale` (sibling hook not updated) | Logic gap | JW-10 adjacent but doesn't cover calculations |
| 9 | CSS `var(--text-scale)` without `, 1` fallback | Logic gap | JW-33 covers inline only |
| 10 | `Youtube` icon doesn't exist in lucide-react | Knowledge gap | **JW-30** caught it at build |
| 11 | BlockType + BLOCK_ICONS record sync | Process gap | Build gate caught it |

---

## Root Cause Analysis

**Pattern 1 — Sibling code parity (mistakes #1, #8):** When fixing a calculation in one hook, sibling hooks doing the same math were not checked. `useBlockDrag` had scale division, `useBlockResize` did not.

**Pattern 2 — Hidden media elements (mistakes #2, #3):** `display: none` removes elements from browser layout pipeline. Video dimensions report 0x0, autoPlay doesn't fire. Two bugs from one root cause.

**Pattern 3 — Scope discipline (mistake #7):** Multi-file feature implementation started without a plan. User had to intervene with "stop and plan it first."

**Pattern 4 — CSS variable safety (mistake #9):** `var(--text-scale)` without `, 1` fallback causes text to vanish when variable isn't set. JW-33 covered inline styles but not CSS files.

---

## New Prevention Rules

### JW-35: Sibling-Code Parity Check
**Trigger:** Fixing a calculation, transform, or coordinate math in a hook/utility/handler.
**Checklist:**
1. Grep for all files doing the same category of math (e.g., "divide by scale", "multiply by devicePixelRatio")
2. List them all. Verify each applies the same fix or document why it should differ.
**Escape hatch:** If the fix is truly unique to one call site (documented why), skip.

### JW-36: Plan-Before-Build Gate (>3 files)
**Trigger:** About to implement a feature touching >3 files or >100 lines of new code.
**Checklist:**
1. Write a numbered plan listing files to touch and changes per file
2. Get user confirmation before writing code
3. If the user says "stop and plan," immediately revert uncommitted changes and produce the plan
**Escape hatch:** Bug fixes and single-file changes are exempt.

### JW-37: Hidden Media Elements Must Stay in Layout
**Trigger:** Creating or hiding a `<video>`, `<audio>`, or `<canvas>` element that will be read programmatically.
**Checklist:**
1. Never use `display: none` — use `opacity: 0; position: absolute; pointer-events: none`
2. Ensure `autoPlay` and `playsInline` are set on video elements that must play without user gesture
**Escape hatch:** Purely decorative elements never read programmatically can use `display: none`.

### JW-33 Amendment
**Current:** Covers inline `fontSize` only.
**Addition:** In CSS files, every `var(--text-scale)` must include a fallback: `var(--text-scale, 1)`.

---

## Integration Points

- **JW-35** → applies when editing `useBlockDrag.ts`, `useBlockResize.ts`, or any coordinate math
- **JW-36** → applies at the start of any feature work (check file count first)
- **JW-37** → applies when working on VideoCaptureBlock or any media-related component
- **JW-33 amendment** → applies during CSS review passes

---

## Summary

- 3 new rules (JW-35, JW-36, JW-37) + 1 amendment (JW-33)
- 3 of 11 mistakes were caught by existing rules that weren't followed (JW-26, JW-30, JW-16)
- Most impactful: JW-35 (sibling parity) prevents a repeating pattern across drag/resize/pan hooks
- User intervention "stop and plan" elevated to JW-36 enforcement
