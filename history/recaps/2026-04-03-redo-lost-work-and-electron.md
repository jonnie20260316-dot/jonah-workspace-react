---
date: 2026-04-03
title: Electron Build Fixes + Redo Lost React Work (Phase 9B/9C + Font + Calendar)
Requested by: User
Executed by: Claude Code
Wrap-up written by: Claude Code
---

# Session Recap: Electron Fixes + Redo Lost React Work

## What Was Worked On

### Lane 1: Electron Build Fixes
- Friend on Intel Mac hit `Cannot find module 'electron-updater'` in packaged app
- Root cause: `electron-builder.yml` had `"!node_modules/**"` which excluded ALL node_modules
- Fix: changed to `node_modules/**` (positive inclusion)
- Also added macOS `extendInfo` for `NSMicrophoneUsageDescription` + `NSCameraUsageDescription` (mic/camera permission prompts)

### Lane 2: Data Loss Discovery
- After pulling repo to standalone location, discovered the Phase 9B/9C, font scaling, calendar, and pan fix work was all on yesterday's version
- Root cause: Those changes only existed in `/Users/jonnie/jonah-workspace-react` (standalone) which was deleted and replaced with a fresh GitHub clone
- None of that work had been committed to git → permanent data loss

### Lane 3: Redo All Lost Work (7 Steps, All Committed)

| Step | Commit | Description |
|------|--------|-------------|
| 1 | `80f2745` | Space pan fix — `data-pan-mode` on body, blur active element, prevent scroll |
| 2 | `62493e3` | Calendar portal fix — `getBoundingClientRect` + `createPortal` (JW-32) |
| 3 | `cedde6b` | Font size settings — Gear menu 0.82–1.25× scale control |
| 4 | `53f46cb` | Block font scale infrastructure — Opt+drag, per-block `textScale` |
| 5 | `5dc1503` | 149 inline fontSize → `calc(Xpx * var(--text-scale))` across 15 block files (JW-33) |
| 6 | `5b00e5f` | Phase 9C — 17px/700 title, 32px accent-tinted icon pill in block header |
| 7 | `525fd5a` | Phase 9B — 30px radius, smart date, 48 bilingual strings, 10% larger blocks |

All 7 commits pushed to `jonnie20260316-dot/jonah-workspace-react`.
Build verified at 1790–1791 modules, 0 TypeScript errors after each step.

## Source of Truth

**`/Users/jonnie/jonah-workspace-react`** is the canonical primary React workspace.
Connected to GitHub: `jonnie20260316-dot/jonah-workspace-react`
The nested copy at `/Users/jonnie/jonah-workspace/jonah-workspace-react` is a legacy artifact — do not treat it as current.

## Key Decisions

- Commit-after-every-step discipline adopted: no session ends with uncommitted meaningful work
- `npm run build` is the verification gate before every commit (JW-30)
- New prevention rule JW-34 added: **Commit-Before-Delete** (see lessons-locked)

## Still Pending

- Rebuild DMG with recovered features (`npm run electron:build:mac`) and redistribute to friend
- arm64 build had a lockfile race condition — not yet resolved

## Lessons Locked

- **JW-34**: Commit-Before-Delete — never `rm -rf` or `git clone` to replace a directory without verifying `git status` + `git log origin/main..HEAD` first. See `2026-04-03-lessons-locked-redo.md`.
