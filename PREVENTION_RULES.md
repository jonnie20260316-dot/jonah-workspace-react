# Prevention Rules (Active)

All active prevention rules for agents working in this repo.
Most-violated: **JW-30** (build gate), **JW-34** (commit before delete), **JW-37** (plan before build).

| Rule | Summary |
|------|---------|
| JW-8 | **Session Storage Allowlisting** — use explicit GLOBAL_KEYS allowlist to route storage keys. Never pattern-match. New structural key = add to GLOBAL_KEYS immediately. |
| JW-9 | **Clarify Before Diagnosing** — when user reports a bug, ask one clarifying question before diving into code. |
| JW-10 | **Cross-Layer Constant Sweep** — when changing a constant (CSS var, JS const, HTML attribute), grep the entire codebase for all references before editing. |
| JW-11 | **Product Context Overrides Defaults** — infinite canvas apps should NOT have responsive breakpoints. Remove, don't patch. |
| JW-12 | **Undo Flag Guard** — any flag set during an undo operation must be cleared in a finally block. |
| JW-13 | **Replace-All Audit** — before using `replace_all: true`, list every match and confirm all should change. |
| JW-14 | **Lazy DOM Lookup** — never cache DOM references at module level; query inside the function that uses them. |
| JW-15 | **bindDataStores After Modal Injection** — call bindDataStores() after any modal/panel is injected into DOM, not before. |
| JW-16 | **Visual Verification Gate** — after any UI feature implementation, open the app and visually confirm the output before marking done. Code existing ≠ feature rendering. |
| JW-17 | **Board Geometry Single Source** — treat `boardSize.w` / `boardSize.h` as the only live board dimensions. After touching spawn or centering logic, create a fresh block in the browser and check console errors. |
| JW-18 | **Playwright Transient Banner Dismiss** — after any `page.reload()` in Playwright tests following localStorage injection, dismiss all transient banners before clicking nav elements. |
| JW-19 | **Capture-Before-Close** — before `closeModal(); rerenderBlock(moduleVar);`, read what closeModal() nullifies. Capture module-level state first. |
| JW-20 | **Exhaustive Call-Site Enumeration** — before migrating/replacing calls to a function, grep ALL call sites, write the full inventory, categorize each (migrate/skip/special), and verify counts after. |
| JW-21 | **Invariant-First Fix Design** — when fixing a bug where a function destroys state, state the invariant, identify ALL violating paths, and fix at the right level. |
| JW-22 | **Iframe Document Continuity** — never call `iframe.remove()` before a DOM rebuild if the iframe should survive. Move it to an in-document stash instead. |
| JW-23 | **Nullish Coalesce in JSON Deserialization** — use `parsed ?? fallback` not just `parsed || fallback` when deserializing JSON from localStorage. |
| JW-24 | **Store-Owns-State Gate** — if a Zustand store manages a storage key, all reads/writes must go through the store's actions. Never bypass with direct `loadJSON`/`saveJSON`. |
| JW-25 | **Storage Key Type Safety** — never use raw string literals for global storage keys outside `constants.ts`. Typos silently write to the wrong location. |
| JW-26 | **Fresh-State-in-Handlers** — in React, never spread render-closure Zustand state in handlers. Read fresh via `useXxxStore.getState()`. Use functional updater `setState(prev => ...)` inside async/interval callbacks. |
| JW-27 | **No Lint Suppression Without Justification** — never add `eslint-disable` to make code compile. Fix the violation. Suppressed Rules-of-Hooks violations become runtime crashes. |
| JW-28 | **Browser Resource Cleanup on Unmount** — every `createObjectURL` needs `revokeObjectURL`. Every `getUserMedia` needs `track.stop()`. Every `setInterval` needs `clearInterval`. All in unmount/cleanup. |
| JW-29 | **Component Extraction for Hooks in Loops** — never call hooks inside a function invoked from `.map()`. Extract loop body into a named child component. |
| JW-30 | **`npm run build` is the Build Gate** — In Vite+React projects, root `tsconfig.json` has `"files": []` so `tsc --noEmit` checks NOTHING. Always use `npm run build`. Never mark React work done without it. |
| JW-31 | **`pick()` at Module Scope is Frozen** — `pick()` reads `_lang` at call time. Module-level constants using `pick()` freeze in the initial language. All bilingual string data must be defined inside render functions or `useMemo`. |
| JW-32 | **Portal + getBoundingClientRect for Overlays Under Transformed Ancestors** — `FloatingTopBar` uses `transform: translateX(-50%)`. Any dropdown/overlay inside it must use `createPortal(overlay, document.body)` + `position: fixed` + `getBoundingClientRect()` coordinates. Clamp `left` to viewport edges. |
| JW-33 | **Inline Style Specificity Trap** — `style={{ fontSize: "Xpx" }}` beats any CSS class rule silently. When using `--text-scale`, all inline fontSize must be `fontSize: "calc(Xpx * var(--text-scale))"`. In CSS files, every `var(--text-scale)` must include a fallback: `var(--text-scale, 1)`. Modals outside `.board-block` keep absolute `px`. |
| JW-34 | **⚠️ Commit-Before-Delete** — Before `rm -rf`, `git clone` to replace a local dir, or any directory swap: run `git status` and `git log --oneline origin/HEAD..HEAD`. If local-only state exists, push or stash first. "Latest on GitHub" ≠ "latest on disk". |
| JW-35 | **BlockType + Icon Registry Co-Check** — When adding a `BlockType` enum variant in `src/types.ts`, immediately add a corresponding entry to `BLOCK_ICONS` Record in `src/utils/blockIcons.ts`. Checklist: (1) edit BlockType, (2) import icon from lucide-react, (3) add to BLOCK_ICONS, (4) run `npm run build`. |
| JW-36 | **Sibling-Code Parity Check** — When fixing a calculation, transform, or coordinate math in a hook/utility, grep for all files doing the same category of math. Verify each applies the same fix or document why it should differ. |
| JW-37 | **Plan-Before-Build Gate (>3 files)** — Before implementing a feature touching >3 files or >100 lines, write a numbered plan listing files and changes per file. Get user confirmation before coding. Bug fixes and single-file changes exempt. |
| JW-38 | **Hidden Media Elements Must Stay in Layout** — Never use `display: none` on `<video>`, `<audio>`, or `<canvas>` elements that will be read programmatically. Use `opacity: 0; position: absolute; pointer-events: none`. Ensure `autoPlay` and `playsInline`. |
| JW-39 | **Input-Focus Guard Before Global Key Hijacking** — Any `window` keydown handler that calls `preventDefault()` or `blur()` MUST first check `isTextInputFocused()`. Return early if focus is in `<input>`, `<textarea>`, or `contentEditable`. |
| JW-40 | **New Storage Keys Must Be in GLOBAL_KEYS Before First Write** — Any localStorage key persisting across sessions must be added to `GLOBAL_KEYS` in `constants.ts` BEFORE any code writes to it. |
| GIT-EXEC-1 | **⚠️ Never use `exec` for network calls requiring auth** — `child_process.exec('git push ...')` hangs 30s silently. Use `https.request` with explicit `Authorization: Bearer {token}`, 15s timeout. |
| WEBVIEW-PERSIST-1 | **Never change `key` prop on webview/iframe; render all sources and hide inactive ones** — Changing key forces React unmount. Hide inactive via `visibility: hidden` + `pointerEvents: none`. Add `keepMounted: true` to BlockRegistry for webview blocks. |
| STORAGE-MIGRATION-1 | **One-time migration when changing block storage scope (global ↔ daily)** — Write `migrate*ToBar()` gated by flag in GLOBAL_KEYS. Call at App boot before first render. |
| EXTERNAL-API-OVERRIDE-GUARD | **Inspect external API responses for silent overrides** — HTTP 200 ≠ your parameters were honored (e.g. YouTube privacy restrictions). Detect mismatch immediately and attempt remediation. |
