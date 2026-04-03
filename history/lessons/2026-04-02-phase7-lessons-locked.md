# Lessons Locked — 2026-04-02 Phase 7 (React Gap Remediation)

Requested by: User
Executed by: Claude Code
Wrap-up written by: Claude Code

---

## Mistake 1: `tsc --noEmit` gave false confidence

### What went wrong
During Phase 7 verification, `npx tsc --noEmit` was run against the root `tsconfig.json` and reported 0 errors. This was taken as a signal that TypeScript was clean. When `npm run build` ran later, it failed with 15+ type errors.

### When
Phase 7 gap remediation session (2026-04-02). The type errors were pre-existing from Phase 5 sync middleware work.

### Why
The root `tsconfig.json` in this Vite+React project has `"files": []` combined with project references to `tsconfig.app.json` and `tsconfig.node.json`. When `tsc --noEmit` is run against a tsconfig with an empty `files` array and no `include`, TypeScript checks literally zero source files. It exits cleanly because there is nothing to check. The `npm run build` script uses `tsc -b` (build mode) which properly resolves project references and runs full type checking via `tsconfig.app.json`.

### Root cause
Tool gap: did not understand the distinction between `tsc --noEmit` (checks the root tsconfig's own file list) and `tsc -b` (resolves project references and checks all referenced configs). In a project-references setup, the root tsconfig is a coordinator, not a source file list.

### Impact
Pre-existing Phase 5 bugs were not caught until mid-Phase 7 when `npm run build` ran. Had to diagnose and fix two unexpected type errors:
- `ReturnType<typeof Array.isArray>` evaluated to `boolean`, not `ProjectCard[]`, in `useSyncStore.ts`
- File System Access API methods (`requestPermission`, `queryPermission`, `showDirectoryPicker`) are not in TypeScript's standard DOM lib — required `@ts-ignore` with documented justification per JW-27

---

## Mistake 2: Module-level `pick()` call in bilingual data

### What went wrong
`BUILTIN_SOUNDS` was defined as a module-level constant in `TimerSettings.tsx`:

```typescript
const BUILTIN_SOUNDS: SoundItem[] = [
  { id: "__none__", name: pick("無", "None"), url: "" },
  { id: "__bell__", name: pick("輕鐘", "Gentle Bell"), url: "" },
];
```

### When
Phase 7 implementation of `TimerSettings.tsx`. Caught in the same session before shipping; fixed immediately.

### Why
`pick()` in `src/utils/i18n.ts` reads a module-level `_lang` variable at call time. Module-level constants are evaluated once at import time. When the user switches language at runtime, `_lang` updates but the constant is already materialized — the sound names are frozen in whatever language was active when the module first loaded.

### Root cause
Logic gap: conflated "reading a reactive value" with "calling a pure function". `pick()` looks like a pure function but it reads shared mutable state (`_lang`). Calling it outside a component render cycle means the result is never re-evaluated on state change.

### Impact
Would have caused a subtle bilingual bug: sound selector labels would display in the initial language regardless of the language toggle. Caught early in-session; no user impact.

---

## Pre-existing Phase 5 Bugs Surfaced (not new mistakes, documented for completeness)

These were not introduced in Phase 7 but were exposed by Phase 7 running `npm run build`:

1. **`useSyncStore.ts`**: `Array.isArray(parsed)` returns `boolean`; was incorrectly typed as `ProjectCard[]`. Fix: add explicit type guard with cast.
2. **File System Access API types**: `FileSystemDirectoryHandle.requestPermission`, `.queryPermission`, and `window.showDirectoryPicker` are non-standard extensions not in TypeScript's `lib.dom.d.ts`. Fix: `@ts-ignore` with justification comment (allowed per JW-27 for vendor API gaps, not logic suppression).

---

## Prevention Rules

### JW-30: `tsc -b` is the build gate, not `tsc --noEmit`

**Trigger:** Running TypeScript type-check in a Vite+React project with project references.

**Rule:** In this project, `npx tsc --noEmit` against the root `tsconfig.json` checks nothing — the root has `"files": []`. Always use `npm run build` as the TypeScript verification gate. If a fast pre-build check is needed, use `npx tsc -b --noEmit` (build mode with noEmit) to resolve project references without emitting files. Never treat root-level `tsc --noEmit` exit code 0 as a clean bill of health.

**Checklist:**
- [ ] After any type-system-touching change, run `npm run build`, not `tsc --noEmit`
- [ ] If CI adds a typecheck step, ensure it runs `tsc -b` or `npm run build`, not `tsc --noEmit`
- [ ] When onboarding a new agent to this repo, flag this distinction immediately

---

### JW-31: `pick()` at module scope is frozen

**Trigger:** Writing bilingual string data (arrays, objects with labels/names) that uses `pick()`.

**Rule:** `pick()` reads `_lang` at call time. Module-level constants (defined with `const` at the top of a file, outside any component) are evaluated once at import time and never re-evaluated. Bilingual string data must be computed inside render functions or `useMemo` so they re-evaluate when language changes. Never call `pick()` outside a React component or render function.

**Pattern — wrong:**
```typescript
// Frozen at import time — never updates on language change
const SOUND_OPTIONS = [
  { id: "bell", name: pick("鐘", "Bell") },
];
```

**Pattern — correct:**
```typescript
// Re-evaluated each render — updates on language change
function getSoundOptions() {
  return [
    { id: "bell", name: pick("鐘", "Bell") },
  ];
}
// Inside component:
const soundOptions = useMemo(() => getSoundOptions(), [lang]);
```

**Checklist:**
- [ ] Before defining any array/object constant with `pick()`, ask: "is this at module scope?"
- [ ] If yes, convert to a function or `useMemo` call inside the component
- [ ] Search for other existing module-level constants using `pick()` when touching i18n-adjacent files

---

## Integration Points — Where to Apply These Checks

| Check | When to Apply |
|-------|--------------|
| JW-30 | Every TypeScript verification step. Run `npm run build` as final gate before marking any phase done. Add to Definition of Done checklist in CLAUDE.md. |
| JW-31 | Code review of any file with bilingual string data. Grep for `pick(` outside of function/component bodies before merging new block implementations. |
| Both | Agent handoff notes — flag these to the next agent when handing off React work. |

---

## Updates Required in CLAUDE.md

Add JW-30 and JW-31 to the Prevention Rules table in CLAUDE.md and to the Definition of Done checklist:

```
- [ ] `npm run build` (not `tsc --noEmit`) passes with zero errors (JW-30)
```
