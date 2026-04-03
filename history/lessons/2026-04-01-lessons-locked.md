# Lessons Locked — 2026-04-01

Session: threads-intel Phase 5 (Export, Archive, Pagination)

---

## Section 1: Mistakes Extracted

### Mistake 1: Playwright gear button timeout (recovery banner intercept)

- **When:** Visual verification step 4 — attempting `page.click('#gearBtn')` after reload with injected localStorage state
- **What:** Playwright reported the element was not clickable / timed out. The gear button was visually present but pointer events were intercepted by the recovery banner overlay.
- **Why:** The test script injected `threads-intel-records` (65 records) into localStorage, then reloaded the page. On reload, `checkForRecovery()` detected a checkpoint and rendered the recovery banner (`.recovery-banner.show`) with a high z-index, physically covering the gear button in the top-right nav area.
- **Impact:** Test failed; required workaround — added `page.evaluate()` to remove `.show` class from all transient banners before the gear click. Minor delay, no production impact.

---

## Section 2: Root Causes

### Root Cause A: Test setup triggers production persistence behavior
- Injecting localStorage before reload is standard test practice
- But workspace.html's 7-layer persistence system (Layer 4: recovery banner) legitimately reacts to the injected state as if a crash occurred
- Tests did not account for this side effect

### Root Cause B: Nav element coverage not checked
- The gear button, save button, and date nav are all in the top bar
- High-z-index transient banners (recovery, multi-tab, quota) can overlay this area
- No standard "dismiss banners first" step in visual verification scripts

---

## Section 3: Prevention Rules

### JW-18: Playwright Transient Banner Dismiss

**Trigger:** Writing Playwright tests that interact with nav elements (gear button, date nav, save button) after a page reload that includes localStorage state injection.

**Checklist:**
1. After any `page.reload()` following localStorage injection, add banner-dismissal snippet:
   ```javascript
   await page.evaluate(() => {
     document.querySelectorAll('.recovery-banner, .multitab-banner, .quota-banner')
       .forEach(b => b.classList.remove('show'));
   });
   await page.waitForTimeout(100); // CSS transition
   ```
2. This applies before: clicking #gearBtn, clicking date nav arrows, clicking #saveBtn
3. If test still fails after banner dismissal, take debug screenshot: `page.screenshot({ path: '/tmp/debug.png' })`

**Escape hatch:** If banner dismissal isn't enough, add `page.waitForSelector('#gearBtn:not([aria-disabled])')` before clicking.

**Why:** workspace.html's 7-layer persistence system (Layer 4 recovery banner, Layer 5 multi-tab banner) renders high-z-index overlays on boot when conditions are met. Test setups that manipulate localStorage reliably trigger Layer 4. Nav elements in the top bar are covered when these banners appear.

---

## Section 4: Integration Points

- Add banner-dismissal snippet as a standard block in any future `test_phase*.cjs` script that includes a `page.reload()` after localStorage injection
- JW-18 added to CLAUDE.md Prevention Rules table
- JW-18 added to MEMORY.md Prevention Rules table
