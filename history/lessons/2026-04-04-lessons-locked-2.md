# Lessons Locked — 2026-04-04 (Session 2)

---

## Mistakes Extracted

### Mistake 1: Space Pan Fix Broke Text Input Typing

**When:** Space pan fix implemented (earlier today, `useBlockDrag`/`useBlockResize` guards)
**What:** The keydown handler in Canvas.tsx unconditionally called `e.preventDefault()` and `document.activeElement.blur()` for ALL Space keydowns, even when focus was inside a text input or textarea.
**Why:** The developer assumed the Space key is always a canvas shortcut, without considering the case where an HTML input element owns the focus.
**Impact:** Completely broke typing of space characters in all block text inputs. Chinese IME composers doubly affected (Space is used to confirm character selection in many Chinese input methods).

---

## Root Causes

1. **Missing input-focus guard in global keyboard handler** — The handler was written for the "canvas owns everything" case. There was no check like `if (isTextInputFocused()) return;` before hijacking the key.

2. **No "typing context" test at time of implementation** — The Space pan feature was tested by pressing Space on the canvas (correct) but not while a text input was focused (missed case).

3. **JW-9 was not followed** — Before fixing the Space pan issue, a clarifying question about what "spaces stop working" edge cases exist would have surfaced the typing regression earlier.

---

## Prevention Rules

### JW-39: Input-Focus Guard Before Global Key Hijacking

**Rule:** Before any `window.addEventListener("keydown", ...)` handler calls `preventDefault()`, `blur()`, or activates a canvas/application shortcut, it MUST check if `document.activeElement` is a text input.

**Trigger:** Any time a keyboard shortcut is added that uses a key that is also a regular typing character (Space, Delete, Backspace, arrow keys, Enter, etc.) and the handler is at `window` level.

**Checklist:**
1. Is this key also used as a text character? (Space → yes; F2 → no)
2. Does my handler call `preventDefault()` or `blur()` unconditionally? → Add guard first
3. Does my handler read `document.activeElement`? → Make sure inputs are excluded
4. Test by: open a text input → focus it → press the key → character should appear

**Guard template:**
```typescript
const isTextInputFocused = (): boolean => {
  const el = document.activeElement;
  if (!el) return false;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLElement && el.contentEditable === "true") return true;
  return false;
};

const onKeyDown = (e: KeyboardEvent) => {
  if (e.code === "Space") {
    if (isTextInputFocused()) return; // let text inputs own their keys
    e.preventDefault();
    // ... activate canvas shortcut
  }
};
```

**Escape hatch:** If pan mode activates unexpectedly in a text input, check Canvas.tsx `onKeyDown` — the `isTextInputFocused()` guard may have been removed or is missing the contentEditable case.

---

## Integration Points

- `src/components/Canvas.tsx` — Space pan handler (already fixed)
- Any future canvas keyboard shortcuts that use typing characters
- `CLAUDE.md` Prevention Rules table — add JW-39
