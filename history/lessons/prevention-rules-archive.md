# Prevention Rules Archive

Retired rules — either one-time lessons, already covered by a core rule, or specific to vanilla HTML era.
Kept for historical reference. Core rules are in `PREVENTION_RULES.md`.

Archived: 2026-04-09

---

## One-Time Lessons (Won't Recur)

| Rule | Summary | Why Archived |
|------|---------|-------------|
| JW-12 | Undo flag must clear in finally block | One-time undo implementation bug |
| JW-15 | bindDataStores after modal injection | Vanilla HTML only |
| JW-17 | Board geometry single source | Fixed once, geometry system stable |
| JW-18 | Playwright transient banner dismiss | Test infrastructure, not app code |
| JW-19 | Capture-before-close for modals | Vanilla HTML modal pattern |
| JW-22 | Iframe document continuity — stash, don't remove | Fixed once with WEBVIEW-PERSIST-1 |
| JW-35 | BlockType + Icon Registry co-check | Covered by build gate (JW-30) — missing icon = type error |
| JW-38 | Hidden media elements: opacity 0, not display none | Fixed once, not recurring |
| WEBVIEW-PERSIST-1 | Never change key prop on webview/iframe | Architecture decision, not recurring |
| STORAGE-MIGRATION-1 | One-time migration when changing block storage scope | Pattern established, won't recur often |

## Covered by Core Rules

| Rule | Summary | Covered By |
|------|---------|-----------|
| JW-9 | Clarify before diagnosing | General practice, not enforceable |
| JW-13 | Replace-all audit before using flag | Covered by JW-10 (grep all refs) |
| JW-14 | Lazy DOM lookup — no module-level caching | React architecture eliminates this |
| JW-16 | Visual verification gate | Covered by Definition of Done checklist |
| JW-20 | Exhaustive call-site enumeration before migration | Covered by JW-10 (grep all refs) |
| JW-21 | Invariant-first fix design | General engineering practice |
| JW-23 | Nullish coalesce in JSON deserialization | TypeScript catches most cases |
| JW-24 | Store-owns-state gate | Architecture pattern, not rule |
| JW-25 | Storage key type safety — no raw strings | Covered by JW-8 (GLOBAL_KEYS) |
| JW-27 | No lint suppression without justification | ESLint reportUnusedDisableDirectives handles this |
| JW-29 | Component extraction for hooks in loops | React Compiler / eslint catches this |
| JW-36 | Sibling-code parity check | Covered by JW-10 (grep all refs) |
| JW-40 | New storage keys in GLOBAL_KEYS before first write | Duplicate of JW-8 |
| GIT-EXEC-1 | Never exec for network calls requiring auth | One-time Electron fix, architecture decided |
| EXTERNAL-API-OVERRIDE-GUARD | Inspect API responses for silent overrides | General practice, YouTube-specific lesson |

## Context-Specific (Vanilla HTML Era)

| Rule | Summary | Why Archived |
|------|---------|-------------|
| JW-11 | No responsive breakpoints in infinite canvas | Architecture decision made |
| JW-32 | Portal + getBoundingClientRect for transformed ancestors | Fixed pattern, documented in code |
| JW-33 | Inline style + --text-scale calc everywhere | CSS system stable |
