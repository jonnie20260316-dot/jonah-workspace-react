# 2026-04-03 — Language Switch Bug Fix

Requested by: User
Executed by: Claude Code
Wrap-up written by: Claude Code

---

## What Was Worked On

Fixed the language switching bug: switching from Chinese to English (or back) was not updating
all components — they still showed the previous language's text.

## Root Cause

`pick(zh, en)` reads the module-level `_lang` variable correctly, but React components only
re-render when they have a Zustand subscription to `lang` state. The subscription is provided
by calling `useLang()` at the top of the component function. 11 components used `pick()` in
their JSX without calling `useLang()`, so they never re-rendered on language change.

## What Shipped

Added `import { useLang } from "../hooks/useLang"` + `useLang()` call to top of each:

| File | Notes |
|------|-------|
| `src/blocks/ContentBlock.tsx` | before `useBlockField` calls |
| `src/blocks/IntelBlock.tsx` | before `useBlockField` calls |
| `src/blocks/IntentionBlock.tsx` | before `useBlockField` calls |
| `src/blocks/KitBlock.tsx` | before `useBlockField` calls |
| `src/blocks/MetricsBlock.tsx` | before `useBlockField` calls |
| `src/blocks/ProjectsBlock.tsx` | before `useModalStore` call |
| `src/blocks/PromptedNotesBlock.tsx` | before `useModalStore` call |
| `src/blocks/SpotifyBlock.tsx` | before `useModalStore` call |
| `src/blocks/ThreadsBlock.tsx` | before `useBlockField` calls |
| `src/components/Canvas.tsx` | before `useRef` calls |
| `src/components/SyncStatusIndicator.tsx` | before `useSyncStore` call |

`GearMenu.tsx` was NOT touched — it already calls `useSessionStore()` which includes `lang`
in its selector, giving it the same subscription automatically.

Build: `✓ built in 304ms`, 1790 modules — clean after all edits.

## Mistakes / Corrections

- Several Edit tool calls failed with "file not read" error. Fix: must Read before Edit.
  This is a known tool constraint, not a code issue.

## Pending / Next

- User needs to run `npx vite` in their own terminal for the dev server to persist.
  Background processes in Claude Code's shell die when the shell session closes.
  Shell alias `jw-dev` runs `npm run dev` (Electron + Vite). For browser-only: `npx vite`.
