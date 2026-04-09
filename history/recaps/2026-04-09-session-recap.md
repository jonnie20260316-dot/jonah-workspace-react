# Session Recap — 2026-04-09

## What We Did

Executed a 4-phase plan to learn from all historical mistakes and make enforcement automatic.

### Phase 1: Zero ESLint Warnings (18 → 0)

Fixed 9 files. Took 3 rounds due to eslint-disable scoping issues (see lessons-locked).

| File | Fix |
|------|-----|
| `src/blocks/VideoCaptureBlock.tsx` | Per-line `eslint-disable-next-line` before each `ref.current` in cleanup; disable before `}, [isStreaming]);` for store registration effect |
| `src/blocks/BrainBlock.tsx` | Added `dir` to 2 effects (reactive prop); left 2 effects at `[]` (outer-scope consts) |
| `src/blocks/DashboardBlock.tsx` | Added `dir` to 1 effect |
| `src/blocks/LabBlock.tsx` | Added `dir` to 2 effects; left 1 at `[]` (outer-scope const) |
| `src/hooks/useBlockDrag.ts` | Added `headerRef` to deps |
| `src/hooks/useBlockResize.ts` | Added `handleRef` to deps |
| `src/blocks/ThreadsIntelBlock.tsx` | Removed unnecessary `records` from useMemo deps |
| `src/blocks/PromptedNotesBlock.tsx` | Removed stale eslint-disable; re-added only for first setState call |
| `src/components/SyncStatusIndicator.tsx` | Removed unused eslint-disable |

### Phase 2: 44 → 12 Core Prevention Rules

Rewrote `PREVENTION_RULES.md` down to 12 rules in 5 categories. Archived 32 retired rules to `history/lessons/prevention-rules-archive.md` with justification for each.

Categories: Build & Safety | React & State | Input & Media | Storage & i18n | Tooling & Cross-Cutting

### Phase 3: Enforcement Automation

1. `eslint.config.js`: Added `reportUnusedDisableDirectives: 'error'` — stale eslint-disable comments now error
2. New file `eslint-rules/no-pick-module-scope.js`: Custom ESLint rule enforcing JW-31 (pick() must not be called at module scope)
3. `CLAUDE.md`: Added "0 ESLint warnings" and "GLOBAL_KEYS check" to Definition of Done

### Phase 4: Bundle Note

Documented: main chunk 524KB (gzip ~144KB). No action until >750KB or user reports slowness.

---

## Final State

- **Commit:** `81270c7` on main, pushed to origin
- **Files changed:** 14 files (192 insertions, 78 deletions)
- **New files:** `eslint-rules/no-pick-module-scope.js`, `history/lessons/prevention-rules-archive.md`
- **Build:** 1839 modules, 0 TypeScript errors ✓
- **ESLint:** 0 errors, 0 warnings ✓

---

## Lessons Locked

See `memory/2026-04-09-lessons-locked.md` for root-cause analysis of 5 mistakes encountered.

**TL;DR prevention rules added:**
- **ESLINT-DISABLE-SCOPE-1**: `eslint-disable-next-line` only suppresses the immediately following line — place inside function bodies, not before the function call
- **EXHAUSTIVE-DEPS-REPORT-LINE-1**: exhaustive-deps warning is at `}, [deps]);` line, not `useEffect(` line — place disable on the line before the dep array
- **REPLACE-ALL-BLAST-GUARD-1**: grep for uniqueness before any `replace_all: true`
- **OUTER-SCOPE-CONST-DEPS-1**: outer-scope constants don't belong in dep arrays; reactive values do
