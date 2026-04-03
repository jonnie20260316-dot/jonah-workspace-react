# Lessons Locked — 2026-03-31

## Mistakes Extracted

### 1. BOARD_WIDTH / BOARD_HEIGHT Undefined (Pre-existing Bug)

- **When:** Discovered during threads-intel implementation when testing + menu
- **What:** `newBlock()` function referenced `BOARD_WIDTH` and `BOARD_HEIGHT` constants that never existed in the codebase. The actual variable is `boardSize` object with `.w` and `.h` properties.
- **Why:** Original code likely had these constants at some point but they were renamed to `boardSize` without updating all references. No grep was run at the time of the rename (violates JW-10).
- **Impact:** Silently broke ALL new block additions via the + menu. `ReferenceError` would fire but was swallowed by the event handler context.

### 2. Radio Input Naming Mismatch

- **When:** During modal event binding implementation
- **What:** Event binding code referenced `input[name="ti-decision"]` but actual HTML had `name="tiDecision"` (camelCase)
- **Why:** Inconsistent naming convention between HTML generation and event binding code written in separate passes
- **Impact:** Decision radio change events didn't fire; conditional comment section didn't toggle. Caught and fixed immediately during testing.

## Root Causes

1. **BOARD_WIDTH bug:** A variable rename was done without a cross-layer constant sweep (JW-10 violation from a prior session). The error was silent because it occurred inside an event handler.
2. **Radio naming:** HTML and JS written in separate implementation passes without verifying that selectors match actual element attributes.

## Prevention Rules

### Reinforced: JW-10 (Cross-Layer Constant Sweep)
The BOARD_WIDTH bug is exactly what JW-10 exists to prevent. This rule is already documented but the bug predated it. No new rule needed — the existing rule would have caught this.

### New Pattern: Selector-Attribute Verification
When writing event binding code that references DOM elements by name/id/class, verify the selector against the actual HTML that generates those elements. This is a variant of JW-10 applied to dynamic DOM generation.

**Not promoted to a numbered rule** — it's covered by the existing practice of testing after every change (definition of done). The mistake was caught within minutes and didn't ship broken.

## Integration Points

No new prevention rules for CLAUDE.md. Existing rules (JW-10, testing workflow) already cover both scenarios.
