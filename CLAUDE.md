# Jonah Workspace React — Shared Agent Context

React + Vite + Electron rebuild of the Jonah Workspace infinite canvas board. Chinese-first, local-first, no backend. Camera-over-workspace model (not a scrollable page).

This file applies to Claude Code, Antigravity, Codex, and other CLI agents working in this repo. It is the durable operating contract for the project, not a Claude-only note.

## Who This Applies To

- Claude Code
- Antigravity
- Codex
- Other CLI or sub-agents working in this repo

## Read Order

Read these in order before meaningful work:

1. `README.md`
2. `CLAUDE.md` (this file)
3. Latest relevant files in `history/recaps/` and `history/lessons/`
4. `MODAL_COMPONENTS.md` — modal architecture reference
5. `TIMER_UI_SPEC.md` — timer block spec

Repo files are the durable memory layer. Chat context only becomes durable after it is written back into repo files.

## Source of Truth

- This repo: `/Users/jonnie/jonah-workspace-react` → GitHub: `jonnie20260316-dot/jonah-workspace-react`
- The nested copy at `/Users/jonnie/jonah-workspace/jonah-workspace-react` is stale — **do not use it**
- History and recaps for vanilla `workspace.html` also live in `/Users/jonnie/jonah-workspace/history/` for reference

## Non-Negotiables

- Chinese-first UI with `pick(zh, en)` bilingual switch (`zh` default)
- Journal + KIT are the centre blocks
- Camera model: explicit viewport state `{x, y, scale}`, not scroll-based
- Input modes coexist: pan (Space hold) + zoom (wheel/trackpad) + block drag + block resize
- New blocks spawn at view centre
- localStorage persistence must survive reload — never silently wipe state
- `npm run build` must pass before any work is considered done (JW-30)
- **Never delete and recreate files wholesale** — edit in place

## Key Constants (React)

```
Storage prefix:    "jonah-workspace:v2:"
LAYOUT_VERSION:    "2026-03-24-f"
GRID:              24
MIN_ZOOM:          0.07 / MAX_ZOOM: 6.0
VIEWPORT_PADDING:  2400
DEFAULT_LANG:      "zh"
```

Defined in: `src/constants.ts`

## GLOBAL_KEYS (persist across dates)

```javascript
"blocks", "viewport", "board-size", "project-board", "lang", "snap",
"overlap", "hero-collapsed", "timer-state", "timer-base-minutes",
"active-date", "session-migration-done", "layout-version",
"timer-settings", "timer-daily-target", "timer-sound",
"threads-intel-records",
"threads-intel-archived", "threads-intel-archive-days",
"history-compact", "sidebar-category-order",
"device-id", "sync-meta", "timer-height-migrated-v1",
"git-sync-enabled", "git-sync-dir", "git-sync-remote",
"github-sync-enabled", "github-sync-repo", "github-sync-token",
"text-scale"
```

GLOBAL_KEY_PREFIXES (dynamic keys matched by prefix):
```javascript
["timer-sessions:", "timer-sounds:", "prompted-notes-config:", "prompted-notes-entries:", "spotify-presets:", "spotify-ui:", "content-draft-history:", "video-capture-settings:", "vc-saved-videos:"]
```

Session-scoped keys use pattern: `session:{YYYY-MM-DD}:{blockId}:{field}`

## Block Types (19)

Core: `journal`, `kit`, `tasks`, `projects`, `intention`, `intel`, `timer`
Extended: `content`, `sticky`, `swipe`, `threads`, `video`, `metrics`, `spotify`, `dashboard`, `threads-intel`, `prompted-notes`, `video-capture`, `youtube-studio`

Unique blocks (only one allowed): `journal`, `kit`, `intention`

Block registry: `src/blocks/BlockRegistry.ts`
Block shell (drag/resize/color/header): `src/blocks/BlockShell.tsx`

## Architecture

```
src/
  blocks/          — 17 block components + BlockShell + BlockRegistry
  components/      — Canvas, FloatingTopBar, DateNav, CalendarModal, GearMenu, FAB, Sidebar, etc.
  hooks/           — useLang, useBlockDrag, useBlockResize, ...
  stores/          — useBlockStore, useSessionStore, useViewportStore, useSyncStore
  styles/          — tokens.css (design tokens)
  utils/           — i18n (pick()), blockIcons, storage helpers
  types.ts         — Block, Session, etc.
  constants.ts     — shared constants
  workspace.css    — all component styles
electron/          — main.js, preload.js
electron-builder.yml — packaging config
```

## Development Commands

```bash
npm run dev              # start Vite dev server
npm run build            # build (TypeScript gate — always run before marking done)
npm run electron:dev     # run in Electron
npm run electron:build:mac  # package DMG
```

Shell aliases (configured in ~/.zshrc):
```bash
jw-dev       # npm run dev in this directory
jw-build     # npm run build in this directory
```

## Development Workflow

1. **Read first** — always read the section you're about to change before editing
2. **One change at a time** — make one logical change, verify it works, then move to the next
3. **Test after every change** — pan/zoom/drag/resize still work? Persistence survives reload? Chinese copy intact?
4. **`npm run build` after every step** — never skip this
5. **Commit after every meaningful step** — uncommitted work is work that can be lost (JW-34)
6. **Plan mode for big changes** — anything touching >3 files or >100 lines should start in plan mode

## Write-Back Protocol

If you change durable behavior or learn context the next agent will need, write it back into the repo before leaving.

Minimum write-back after meaningful work:

- `history/recaps/YYYY-MM-DD-session-recap.md`
- `history/lessons/YYYY-MM-DD-lessons-locked.md` when mistakes or new prevention rules appeared
- `history/WORKSPACE-LOG.md`
- `CLAUDE.md` when durable rules, current state, or operating guidance changed

Do not exit silent after architecture, workflow, storage, guardrail, or major UX changes.

## Definition of Done

- [ ] Pan/zoom/drag/resize work together
- [ ] Zoom anchor correct (cursor for wheel, centre for keyboard)
- [ ] Chinese copy remains default and high quality
- [ ] No regressions in persistence (reload test)
- [ ] No console errors
- [ ] **`npm run build` passes** (NOT `tsc --noEmit` — see JW-30)
- [ ] All meaningful changes committed AND pushed (JW-34)

## Prevention Rules (Active)

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
| JW-18 | **Playwright Transient Banner Dismiss** — after any `page.reload()` in Playwright tests following localStorage injection, dismiss all transient banners before clicking nav elements. High-z-index persistence banners intercept pointer events on the top bar. |
| JW-19 | **Capture-Before-Close** — before `closeModal(); rerenderBlock(moduleVar);`, read what closeModal() nullifies. Capture module-level state first. |
| JW-20 | **Exhaustive Call-Site Enumeration** — before migrating/replacing calls to a function, grep ALL call sites, write the full inventory, categorize each (migrate/skip/special), and verify counts after. |
| JW-21 | **Invariant-First Fix Design** — when fixing a bug where a function destroys state, state the invariant, identify ALL violating paths, and fix at the right level. |
| JW-22 | **Iframe Document Continuity** — never call `iframe.remove()` before a DOM rebuild if the iframe should survive. Move it to an in-document stash instead. Full removal destroys cross-origin browsing context. |
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
| JW-35 | **BlockType + Icon Registry Co-Check** — When adding a `BlockType` enum variant in `src/types.ts`, immediately add a corresponding entry to `BLOCK_ICONS` Record in `src/utils/blockIcons.ts` (with icon import from lucide-react). If you forget, build fails with "Property 'xyz' is missing in type Record<BlockType, LucideIcon>". Checklist: (1) edit BlockType, (2) import icon from lucide-react, (3) add to BLOCK_ICONS, (4) run `npm run build` to verify. |
| JW-36 | **Sibling-Code Parity Check** — When fixing a calculation, transform, or coordinate math in a hook/utility, grep for all files doing the same category of math. List them all. Verify each applies the same fix or document why it should differ. |
| JW-37 | **Plan-Before-Build Gate (>3 files)** — Before implementing a feature touching >3 files or >100 lines, write a numbered plan listing files and changes per file. Get user confirmation before coding. If user says "stop and plan," revert uncommitted changes and produce the plan. Bug fixes and single-file changes exempt. |
| JW-38 | **Hidden Media Elements Must Stay in Layout** — Never use `display: none` on `<video>`, `<audio>`, or `<canvas>` elements that will be read programmatically. Use `opacity: 0; position: absolute; pointer-events: none`. Ensure `autoPlay` and `playsInline` on video elements that must play without user gesture. |
| JW-39 | **Input-Focus Guard Before Global Key Hijacking** — Any `window` keydown handler that calls `preventDefault()` or `blur()` for a canvas shortcut MUST first check `isTextInputFocused()`. If focus is in an `<input>`, `<textarea>`, or `contentEditable` element, return early. Applies to Space, Delete, Backspace, arrows — any key that doubles as a typing character and a canvas action. |
| JW-40 | **New Storage Keys Must Be in GLOBAL_KEYS Before First Write** — Any localStorage key that must persist across sessions must be added to `GLOBAL_KEYS` in `constants.ts` BEFORE any code writes to it. If not in GLOBAL_KEYS, `storageKey()` routes it to `session:{date}:{key}`, making it unreadable on next boot when `_activeDate` is empty. Test: confirm `storageKey(newKey)` returns the global path at init time. |
| GIT-EXEC-1 | **⚠️ Never use `exec` for network calls requiring auth** — `child_process.exec('git push ...')` cannot handle HTTPS credential prompts. Push hangs 30s silently then fails. Use `https.request` with explicit `Authorization: Bearer {token}` header instead. 15s timeout. Immediate 401 on bad credentials. |
| WEBVIEW-PERSIST-1 | **Never change `key` prop on webview/iframe; render all sources and hide inactive ones** — Changing key forces React unmount, destroying webview navigation state. If multiple sources share one container (Claude + ChatGPT, multiple iframes), render all always in DOM. Hide inactive via `visibility: hidden` + `pointerEvents: none`. Add `keepMounted: true` to BlockRegistry for any block containing webviews. |
| STORAGE-MIGRATION-1 | **One-time migration when changing block storage scope (global ↔ daily)** — Write `migrate*ToBar()` function gated by flag in GLOBAL_KEYS. Call at App boot before first render. Function scans old storage key pattern, copies non-empty values to new location, sets flag to skip future runs. Required when block changes from global to session-scoped (or vice versa). |

## Session Protocol — Wrap It Up

When the user says **"wrap it up"**, **"收工"**, or **"總結"**, run these steps in order:

### Step 1 — Write Session Recap
Create: `history/recaps/YYYY-MM-DD-session-recap.md`

Put this metadata block near the top:

```
Requested by: [User | Codex | Claude Code | Antigravity | Other agent | Unknown]
Executed by: [User | Codex | Claude Code | Antigravity | Other agent | Unknown]
Wrap-up written by: [User | Codex | Claude Code | Antigravity | Other agent | Unknown]
```

Include:
- What was worked on (lane summary, not every micro-turn)
- What shipped (files changed, features added, bugs fixed)
- What is still in progress or pending
- Key decisions made

### Step 2 — Write Lessons Locked (if mistakes happened)
If errors, wrong approaches, or corrections occurred, create:
`history/lessons/YYYY-MM-DD-lessons-locked.md`

If no mistakes: skip this file.

### Step 3 — Update WORKSPACE-LOG.md
Append one line to `history/WORKSPACE-LOG.md`:
```
YYYY-MM-DD | [one-sentence summary of what happened]
```

### Step 4 — Update Prevention Rules (if new)
If Step 2 produced new rules, add them to the Prevention Rules table above.

### Step 5 — Commit and Push
```bash
git add history/ CLAUDE.md
git commit -m "session wrap-up YYYY-MM-DD: [short description]"
git push
```

---

## History

Session recaps and lessons-locked files are in `history/`. Check the latest before starting a new round of work.

Current state: **v1.0.6 — GitHub REST API sync** — Replaced broken git binary sync with direct GitHub Contents API (PAT auth, 15s timeout, deterministic). GearMenu: repo URL + PAT inputs. Auto-migration from old git-sync-remote key. 2-min auto-backup interval. Build ✓ 1795 modules.

Electron: bundle includes `node_modules` (electron-updater fix). macOS mic/camera plist entries added.

## Off-Limits

- Do not edit OpenClaw config (`~/.openclaw/openclaw.json`, `.env`, session files)
- Do not add external dependencies unless explicitly requested
- Do not edit `electron/` files without understanding the preload security model
