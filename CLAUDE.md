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

## Constants, GLOBAL_KEYS, and Directory Layout

→ See `ARCH_REFERENCE.md` for Key Constants, GLOBAL_KEYS list, GLOBAL_KEY_PREFIXES, and full directory layout.

## Block Types (19)

Core: `journal`, `kit`, `tasks`, `projects`, `intention`, `intel`, `timer`
Extended: `content`, `sticky`, `swipe`, `threads`, `video`, `metrics`, `spotify`, `dashboard`, `threads-intel`, `prompted-notes`, `video-capture`, `youtube-studio`

Unique blocks (only one allowed): `journal`, `kit`, `intention`

Block registry: `src/blocks/BlockRegistry.ts`
Block shell (drag/resize/color/header): `src/blocks/BlockShell.tsx`

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
- [ ] **0 ESLint warnings** — `npx eslint src/` clean
- [ ] **`npm run build` passes** (NOT `tsc --noEmit` — see JW-30)
- [ ] New storage keys added to `GLOBAL_KEYS` in `constants.ts` first (JW-8)
- [ ] All meaningful changes committed AND pushed (JW-34)

## Prevention Rules (12 Core)

→ See `PREVENTION_RULES.md` for the 12 core rules. Archive: `history/lessons/prevention-rules-archive.md`.

Top 3 — memorize:
- **JW-30**: `npm run build`, not `tsc --noEmit`. tsconfig has `"files": []`.
- **JW-34**: `git status` before any `rm -rf`. Data loss incident 2026-04-03.
- **JW-37**: >3 files → numbered plan first.

## Session Protocol

→ See `SESSION_PROTOCOL.md`. Triggered by **"wrap it up"**, **"收工"**, or **"總結"**.

---

## History

Session recaps and lessons-locked files are in `history/`. Check the latest before starting a new round of work.

Bundle: main chunk 524KB (gzip ~144KB). No action unless >750KB or user reports slowness.

Current state: **v1.0.6 — GitHub REST API sync** — Replaced broken git binary sync with direct GitHub Contents API (PAT auth, 15s timeout, deterministic). GearMenu: repo URL + PAT inputs. Auto-migration from old git-sync-remote key. 2-min auto-backup interval. Build ✓ 1795 modules.

Electron: bundle includes `node_modules` (electron-updater fix). macOS mic/camera plist entries added.

## Off-Limits

- Do not edit OpenClaw config (`~/.openclaw/openclaw.json`, `.env`, session files)
- Do not add external dependencies unless explicitly requested
- Do not edit `electron/` files without understanding the preload security model
