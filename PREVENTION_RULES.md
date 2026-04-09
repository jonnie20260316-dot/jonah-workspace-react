# Prevention Rules — 12 Core Rules

These are the 12 rules that have prevented (or would have prevented) the most damage in this repo.
Each is linked to a real incident. Full archive of retired rules: `history/lessons/prevention-rules-archive.md`.

---

## Build & Safety

| # | Rule | One-liner |
|---|------|-----------|
| 1 | **JW-30** | `npm run build` is the build gate — `tsc --noEmit` checks nothing (`tsconfig.json` has `"files": []`). Never mark done without it. |
| 2 | **JW-34** | `git status` + `git log origin/HEAD..HEAD` before any `rm -rf` or directory swap. Data loss incident 2026-04-03. |
| 3 | **JW-37** | >3 files or >100 lines → write a numbered plan + get confirmation before coding. |

## React & State

| # | Rule | One-liner |
|---|------|-----------|
| 4 | **JW-26** | `getState()` for Zustand in async/interval callbacks — never spread render-closure state. |
| 5 | **JW-28** | Unmount cleanup: `revokeObjectURL`, `track.stop()`, `clearInterval`. Every time. |
| 6 | **EFFECT-DEPS-STABILIZATION** | Effect deps = lifecycle boundary only. Adding registered values causes register→cleanup infinite loop. Read internal state via `getState()`. |

## Input & Media

| # | Rule | One-liner |
|---|------|-----------|
| 7 | **JW-39** | `isTextInputFocused()` before any `window` keydown `preventDefault()`. Space bar in inputs must work. |
| 8 | **VIDEO-SRCOBJECT-1** | Always call `.play()` after reassigning `srcObject` on `<video>`. Frozen frame otherwise. |

## Storage & i18n

| # | Rule | One-liner |
|---|------|-----------|
| 9 | **JW-8** | GLOBAL_KEYS allowlist for storage routing. New key = add to `constants.ts` first. |
| 10 | **JW-31** | `pick()` at module scope freezes in initial language. Bilingual strings in render functions only. |

## Tooling & Cross-Cutting

| # | Rule | One-liner |
|---|------|-----------|
| 11 | **JW-10** | Grep all references before changing any constant (CSS var, JS const, HTML attribute). |
| 12 | **TOOL-EDIT-FORMATTER-1** | >2 edits/file with PostToolUse hooks (ESLint/Prettier) → use Write tool instead. Formatter reverts incremental edits. |
