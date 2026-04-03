# Lessons Locked: React Phase 3 — 2026-04-02

## Section 1: Mistakes Extracted

| # | Severity | What Went Wrong |
|---|----------|-----------------|
| M1 | CRITICAL | CardModal bypassed Zustand — wrote to localStorage directly while ProjectsBlock read from store. Board showed stale data after modal save. |
| M2 | HIGH | Timer handlers used render-closure `timerState` — pause/reset overwrote latest tick value with stale snapshot. |
| M3 | HIGH | useTimerTick race condition — tick interval could overwrite user's pause action between read and write. |
| M4 | HIGH | Timer no persist on stop — up to 29 seconds of progress lost on pause + reload. |
| M5 | HIGH | TasksBlock called hooks inside `.map()` callback — `eslint-disable` comments masked the violation. |
| M6 | HIGH | VideoCaptureBlock `recorder.onstop` captured stale `savedVideos` — deleted videos reappeared. |
| M7 | MEDIUM | Blob URLs never revoked on delete or unmount — memory leak per recording. |
| M8 | HIGH | CardModal storage key typo "projectBoard" vs "project-board" — cards could never load/save. |

## Section 2: Root Causes

**Pattern A — Store Bypass (M1, M8):** Components used `loadJSON`/`saveJSON` directly for data owned by a Zustand store. The store was never notified, so React subscribers saw stale state. M8 compounded this with a key typo that silently wrote to the wrong location.

**Pattern B — Stale Closure in React (M2, M3, M4, M6):** Vanilla-JS mutable state translated into React closures that capture stale snapshots. In workspace.html, `timerState` was a single mutable object — reads and writes always hit the same reference. In React, each render captures a frozen copy. Spreading a stale snapshot in a handler loses concurrent updates from the tick hook.

**Pattern C — Hooks Rules Violation (M5):** Hooks called inside a function invoked from `.map()`. ESLint flagged it correctly, but `eslint-disable` comments suppressed the warning instead of fixing the code.

**Pattern D — Browser Resource Lifecycle (M7):** `URL.createObjectURL()` without matching `URL.revokeObjectURL()` on delete and unmount.

## Section 3: Prevention Rules

| Rule | Trigger | Checklist |
|------|---------|-----------|
| **JW-24: Store-Owns-State Gate** | Any component calling `loadJSON`/`saveJSON` for data a Zustand store manages | (1) Grep every `loadJSON`/`saveJSON` call in `src/blocks/` and `src/modals/`. (2) For each, check if a Zustand store manages the same key. (3) If yes, use the store's action — never bypass. (4) Exception: initial store hydration inside `create()`. |
| **JW-25: Storage Key Type Safety** | Adding or referencing a localStorage key outside `constants.ts` | (1) Every storage key in `loadJSON`/`saveJSON` must be derived from a typed constant or prefix. (2) No raw string literals for global keys. (3) After adding a new key: verify it's in `GLOBAL_KEYS` or matches `GLOBAL_KEY_PREFIXES`. Typos are silent data loss. |
| **JW-26: Fresh-State-in-Handlers** | Any handler/callback/interval that reads Zustand state and writes it back | (1) Never spread render-closure state (`{ ...stateFromHook, ... }`). (2) Always read via `useXxxStore.getState()` at execution time. (3) For `useState`, use functional updater `setState(prev => ...)` inside async/interval callbacks. (4) Grep for `...someStateVar` inside handlers — each is a suspect. |
| **JW-27: No Lint Suppression Without Justification** | Any `eslint-disable` comment | (1) Never suppress a lint warning to make code compile — fix the violation. (2) If genuinely needed, add a comment explaining why. (3) During review: grep for `eslint-disable` — each requires manual check. |
| **JW-28: Browser Resource Cleanup on Unmount** | Component using `createObjectURL`, `getUserMedia`, `MediaRecorder`, `setInterval` | (1) Every `createObjectURL` needs matching `revokeObjectURL` in delete path AND unmount. (2) Every stream needs `track.stop()` in unmount. (3) Every interval needs `clearInterval` in unmount. |
| **JW-29: Component Extraction for Hooks in Loops** | Any `.map()` body needing per-item React state/effects | (1) Extract loop body into a named child component. (2) Call hooks at top level of that component. (3) Never call hooks inside a function invoked from `.map()`. |

## Section 4: Integration Points

- **JW-24, JW-25:** Apply during coding of any block/modal that touches localStorage. Add to code review checklist for React migration.
- **JW-26:** Apply during coding of any component with event handlers that modify Zustand state. Critical for timer, projects, and any real-time feature.
- **JW-27:** Apply during all code generation. The Phase 2 generator should never output `eslint-disable` without explicit justification.
- **JW-28:** Apply during coding of VideoCaptureBlock, SpotifyBlock (iframe lifecycle), and any component acquiring browser resources.
- **JW-29:** Apply during coding of any block with per-item state (TasksBlock, ProjectsBlock cards, ThreadsIntelBlock records).
