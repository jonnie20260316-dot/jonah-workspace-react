# Lessons Locked — 2026-03-28

## JW-16: Visual Verification Gate

**Mistake:** Declared the timer records section (progress bar, stats grid, session log) "complete" based on the plan checklist being done. When the user opened the app, the records section was invisible — the `#timerRecords` div existed but nothing rendered into it.

**When it happened:** After implementing the full timer redesign. All the JavaScript logic and HTML structure were written and integrated correctly. The plan checklist showed every item ticked. But the feature was never actually opened in a browser to verify it rendered.

**Root cause:** Treated code existence as proof of feature completion. Checklist completion ≠ visual output. The gap between "code is written" and "user can see it" is where silent rendering bugs live.

**Prevention rule (JW-16):** After any UI feature implementation, open the app and take a screenshot or look at the actual output before marking done. Compare what you see against the spec. If a section is missing, investigate immediately while the code is fresh — not after declaring it complete.

**How to apply:**
- After writing HTML/CSS/JS for a new UI section: reload the page, look at it
- Before committing: does the output match the design?
- Before saying "done" or "shipped": have you seen it with your own eyes?
