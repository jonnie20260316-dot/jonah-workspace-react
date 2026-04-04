# Jonah Workspace React — Session Log

A running log of all work done in this React + Vite + Electron repo.
Newest sessions at the top.

---

## 2026-04-04 | Space Pan Fix — Block drag/resize yielded to canvas pan when Space held; added `if (document.body.dataset.panMode) return;` guard to useBlockDrag.ts + useBlockResize.ts; added `body[data-pan-mode] .board-block { cursor: grab }` CSS; diagnosed incomplete redo from 2026-04-03; pointer capture coordination resolved; build ✓ 1790 modules

## 2026-04-04 | PiP 畫中畫 + Real Device Enumeration — Screen + camera simultaneous recording; draggable PiP overlay (20%, rounded rect, 4:3 aspect); canvas.captureStream() composition to single output video; replaced hardcoded device lists with live navigator.mediaDevices.enumerateDevices(); device dropdown auto-updates on plug/unplug; devicechange listener cleanup (JW-28); build ✓ 1790 modules

## 2026-04-03 | Screen Recording — Added Camera/Screen mode toggle to VideoCaptureBlock; getDisplayMedia + Web Audio API mixer (system audio + mic); per-session audio toggles; mode-aware UI (objectFit, placeholder, SCR/REC indicator, source badge); bilingualized all strings; build ✓ 1790 modules

## 2026-04-03 | Language Switch Bug Fix — 11 components missing useLang() subscription; added hook to ContentBlock, IntelBlock, IntentionBlock, KitBlock, MetricsBlock, ProjectsBlock, PromptedNotesBlock, SpotifyBlock, ThreadsBlock, Canvas, SyncStatusIndicator; all pick() calls now re-render on lang change; build ✓

## 2026-04-03 | Context migration — CLAUDE.md + full history (recaps/lessons) copied from main workspace; React repo now self-contained with all 34 prevention rules and complete session history

## 2026-04-03 | Redo Lost React Work + Electron Fixes — Recovered Phase 9B/9C/font/calendar/pan after data loss (uncommitted work deleted); fixed electron-updater bundle; added mic/camera plist entries; 7 commits pushed; JW-34 added (Commit-Before-Delete)

## 2026-04-03 | Block Font Scaling Fix — Audited 154 inline fontSize in 15 block components overriding CSS cascade; converted all to calc(Xpx * var(--text-scale)); Opt+drag and global scale now work for ALL content; JW-33 added; build ✓ 1791 modules

## 2026-04-03 | Font Size Settings — Added scale control (0.82–1.25×) to React app; Gear menu "字型大小 / Font Size" row with 5 preset buttons; CSS --text-scale variable applied to block content; localStorage persisted; React build ✓ 1791 modules

## 2026-04-03 | Calendar Centering Fix — FloatingTopBar transform creates containing block; fixed via React portal + getBoundingClientRect() + position:fixed; clamped to viewport edges; JW-32 added

## 2026-04-03 | React Dev Launcher Setup — jw-dev/jw-build shell aliases; ~/.local/bin/jw-react-launcher script; Automator app updated to React

## 2026-04-03 | Phase 9C — Space pan fix (data-pan-mode body flag) + block header hierarchy (17px/700 title, 32px accent-tinted icon pill)

## 2026-04-03 | Phase 9B — Visual parity: 30px radius, backdrop blur, gradient headers, 10% larger blocks, smart date (Today/Yesterday/Tomorrow/Wed. 04.03), 48 bilingual strings across 11 files; 1791 modules ✓

## 2026-04-02 | Phase 8: Conflict Resolution UI — ConflictInfo type, useSyncStore conflictInfo + setConflict/clearConflict, ConflictResolutionModal; 5 files, 0 TS errors

## 2026-04-02 | Phase 7: Gap Remediation — SVG timer ring, daily stats, session log, calendar picker, timer settings, useLang bilingual system; 7 new files, 1789 modules ✓; JW-30+JW-31 added

## 2026-04-02 | Phase 6: Apple-Quality UI Overhaul — Design tokens, animations, 8 shell UI components, 6 color themes; 20+ files, 0 TS errors

## 2026-04-02 | Phase 5: Sync Middleware — File System API, selective sync, Cases A/B/C conflict detection; 74 modules

## 2026-04-02 | Phase 3: Blocks Functional — 8 broken blocks fixed (Tasks/Timer/Projects/ThreadsIntel/PromptedNotes/Spotify/VideoCapture/Intel); deep audit 20+ bugs; JW-24–JW-29 added

## 2026-04-02 | React Migration Kickoff — Full planning, URD, pre-flight checklist; zero workspace.html changes
