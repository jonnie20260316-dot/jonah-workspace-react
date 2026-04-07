# Jonah Workspace React — Comprehensive Error Audit

**Date:** 2026-04-07
**Compiled by:** Claude Code
**Source:** CLAUDE.md prevention rules, history/lessons/, WORKSPACE-LOG.md, MEMORY.md

---

## Summary

**Total documented bugs:** 58+
**Active prevention rules:** 40+ (JW-8 through JW-40, plus domain-specific rules)
**Categories:** 7 (Data Loss, UI/UX, Video/Media, Layout, Sync, Security, Code Quality)

---

## Category 1: Data Loss / Persistence (7 bugs)

| # | Bug | Root Cause | Status | Prevention Rule |
|---|-----|-----------|--------|----------------|
| 1 | **Uncommitted work deleted** (2026-04-03) | `rm -rf` without checking `git status` + `git log origin/HEAD..HEAD` | Fixed (reconstruction) | **JW-34** Commit-Before-Delete |
| 2 | **GitHub settings lost across restart** (2026-04-04) | Storage keys not in GLOBAL_KEYS, routed to session-scoped | Fixed | **JW-40** GLOBAL_KEYS Before First Write |
| 3 | **Sticky note content not refreshing on date switch** (2026-04-07) | `useState` lazy initializer only runs once on mount | Fixed | **HOOK-DATE-SCOPE-1** |
| 4 | **localStorage flush race on quit** (2026-04-04) | `localServer.close()` called before `flushStorageData()` | Fixed (v1.0.5) | **PERSIST-FLUSH-1** |
| 5 | **Timer progress lost on pause+reload** (2026-04-02) | Pause didn't immediately persist to localStorage | Fixed | Covered by persistence layer |
| 6 | **Deleted videos reappear after reload** (2026-04-02) | Stale Zustand closure in `recorder.onstop` | Fixed | **JW-26** Fresh-State-in-Handlers |
| 7 | **Blob URLs never revoked** (memory leak, 2026-04-02) | Missing `revokeObjectURL` on delete/unmount | Fixed | **JW-28** Resource Cleanup |

### Recurring Pattern: Storage Key Routing
Bugs #2 and the sticky daily scope change share the same root cause: keys not routed correctly between global and session-scoped storage. **GLOBAL_KEYS must be updated BEFORE first write** (JW-40).

---

## Category 2: UI/UX Bugs (10 bugs)

| # | Bug | Root Cause | Status | Prevention Rule |
|---|-----|-----------|--------|----------------|
| 8 | **Color picker click swallowed by drag** (2026-03-24) | `setPointerCapture` on drag handler ate click events | Fixed | **JW-4** Drag Handle Exclusion |
| 9 | **Block body overflow** (2026-03-24) | Missing `min-height: 0` in flex child | Fixed | **JW-6** Flex Scroll Child |
| 10 | **CRUD delete missing** (2026-03-24) | Delete deferred as "enhancement" | Fixed | **JW-5** CRUD Completeness |
| 11 | **Timer records invisible** (2026-03-28) | Code existed but never rendered | Fixed | **JW-16** Visual Verification Gate |
| 12 | **Calendar popup clipped** (2026-04-03) | `transform: translateX(-50%)` creates containing block | Fixed | **JW-32** Portal + getBoundingClientRect |
| 13 | **Text vanishing** (2026-04-04) | CSS `var(--text-scale)` without fallback | Fixed | **JW-33** Inline Style + CSS fallback |
| 14 | **Fit button blocks FAB** (2026-04-04) | Fixed controls in same screen area | Fixed | **SURFACE-LAYOUT-1** |
| 15 | **Space typing hijacked by pan mode** (2026-04-04) | No `isTextInputFocused()` guard | Fixed | **JW-39** Input-Focus Guard |
| 16 | **AI Chat can't click text field** (2026-04-07) | Block scaling / pointer-events issue | Fixed (this session) | keepMounted + dual webview |
| 17 | **AI Chat resets to initial page** (2026-04-07) | `key={tab}` unmounts webview | Fixed (this session) | Dual webview pattern |

### Recurring Pattern: Pointer Events / Focus Conflicts
Bugs #8, #14, #15, #16 share a pattern: multiple interactive layers competing for the same pointer/keyboard events. **Prevention:** Always verify that new fixed-position UI elements don't collide with existing ones, and guard global keyboard handlers with focus checks.

---

## Category 3: Video/Media Bugs (10 bugs)

| # | Bug | Root Cause | Status | Prevention Rule |
|---|-----|-----------|--------|----------------|
| 18 | **Video source switch froze preview** (2026-04-04) | Missing `.play()` after srcObject change | Fixed | **VIDEO-SRCOBJECT-1** |
| 19 | **screenVideoRef stale after camera switch** (2026-04-04) | Ref not cleared on switch | Fixed | **STORE-SYNC-1** |
| 20 | **RTMP write-after-end crash** (2026-04-04) | Race: stop() closes stdin while chunks still sent | Fixed | **RTMP-Stop-Safe** |
| 21 | **Hidden video 0x0 dimensions** (2026-04-04) | `display: none` removes from layout | Fixed | **JW-38** Hidden Media in Layout |
| 22 | **Auto-play not firing on hidden videos** (2026-04-04) | Missing `playsInline` + hidden state | Fixed | Covered by JW-38 |
| 23 | **Stale stream in YouTube Studio** (2026-04-04) | Stream store not updated after source switch | Fixed | **STORE-SYNC-1** |
| 24 | **getDisplayMedia failed** (2026-04-04) | Missing `setDisplayMediaRequestHandler()` | Fixed | Documented |
| 25 | **useSystemPicker not in Electron 41** (2026-04-04) | API version mismatch | Fixed | Documented |
| 26 | **App window selected instead of screen** (2026-04-04) | Default source order | Documented | UX guidance |
| 27 | **Video distorts on block resize** (2026-04-07) | Hardcoded `height: 320px` | Fixed (prev session) | `aspectRatio: "16/9"` |

### Recurring Pattern: Stream State Synchronization
Bugs #18, #19, #23 share a pattern: one component changes stream state but doesn't notify other consumers. **Prevention:** STORE-SYNC-1 — always update the shared store when mutating MediaStream or ref state.

---

## Category 4: Layout/Rendering Bugs (4 bugs)

| # | Bug | Root Cause | Status | Prevention Rule |
|---|-----|-----------|--------|----------------|
| 28 | **Block header inconsistency** (2026-03-24–04-02) | Incremental implementation without spec | Fixed (Phase 9B) | Design spec first |
| 29 | **Connector frozen after placement** (2026-04-04) | No post-create drag path | Fixed | **SURFACE-EDIT-1** |
| 30 | **Frame default size too small** (2026-04-04) | Tuned for drawing, not editing | Fixed | **SURFACE-SIZE-1** |
| 31 | **Block collapse CSS fragility** (2026-04-07) | `flex: 0 0 0px` unreliable for video | Fixed (prev session) | `height: 0` pattern |

---

## Category 5: Sync/Network Bugs (4 bugs)

| # | Bug | Root Cause | Status | Prevention Rule |
|---|-----|-----------|--------|----------------|
| 32 | **Git sync never worked** (2026-04-04) | `exec('git push')` can't handle HTTPS auth | Fixed (v1.0.6) | **GIT-EXEC-1** |
| 33 | **Sync kills active recordings** (2026-04-04) | Full array replacement destroys component identity | Fixed | Granular merge |
| 34 | **GitHub settings not persisted** (2026-04-04) | Keys not in GLOBAL_KEYS | Fixed | **JW-40** |
| 35 | **Same-device sync rehydration** (2026-04-04) | No self-skip check | Fixed | Device ID check |

### Recurring Pattern: State Replacement vs Merge
Bug #33 is a critical pattern: replacing an entire array of blocks kills React component identity, stopping active media streams. **Prevention:** Always use granular merge (compare individual blocks by ID) instead of full replacement.

---

## Category 6: Security/Safety (2 items)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 36 | **PAT stored in localStorage** | Live | Users instructed to use limited-scope PATs |
| 37 | **WebView header stripping** | Live | Scoped to claude.ai/chatgpt.com only |

---

## Category 7: Code Quality / Process (26 bugs)

| # | Bug | Root Cause | Prevention Rule |
|---|-----|-----------|----------------|
| 38 | **tsc --noEmit checks nothing** | Root tsconfig has `"files": []` | **JW-30** npm run build |
| 39 | **Module-level pick() frozen** | `pick()` reads `_lang` at call time | **JW-31** |
| 40 | **Hooks inside .map()** | `eslint-disable` suppressed violation | **JW-29** + **JW-27** |
| 41 | **Storage key typo** | Direct `saveJSON` bypass | **JW-24** + **JW-25** |
| 42 | **Stale closure in timer** | Render-closure Zustand state | **JW-26** |
| 43 | **Timer tick race condition** | Non-atomic concurrent reads | **JW-26** |
| 44 | **closeModal nullifies before rerender** | Module state read after close | **JW-19** |
| 45 | **Incomplete call-site migration** | No written inventory | **JW-20** |
| 46 | **Spotify iframe destroyed** | innerHTML wipe | **JW-21** + **JW-22** |
| 47 | **Electron builder 404** | No explicit artifactName | **EBUILD-1** |
| 48 | **Squirrel.Mac signature check** | Ad-hoc signing incompatible | **SQUIRREL-BYPASS-1** |
| 49 | **Missing component import** | File deleted but import survived | **BUILD-IMPORT-1** |
| 50 | **Notarization config wrong schema** | Version mismatch | **EB-RELEASE-SCHEMA-1** |
| 51 | **Screen recording permission reset** | macOS requires signed identity | **SCREEN-PERMISSION-1** |
| 52 | **BlockType + Icon out of sync** | Two files must be updated together | **JW-35** |
| 53 | **Sibling code not updated** | Same math in two hooks | **JW-36** |
| 54 | **Multi-file feature without plan** | Moved fast, lost context | **JW-37** |
| 55 | **Playwright banner intercepts** | High-z recovery banner | **JW-18** |
| 56 | **BOARD_WIDTH undefined** | Constants renamed without sweep | **JW-10** |
| 57 | **Radio input name mismatch** | HTML/JS selector divergence | **JW-10** |
| 58 | **Invalid Date in broadcasts** | Date parsing error | Guards added |

---

## Gap Analysis: Patterns Not Yet Covered

### 1. **Webview State Persistence** (NEW)
**Pattern:** Webviews reset their navigation state when React unmounts/remounts them (via `key` prop changes, component unmounting, or app hot-reload).
**Instances:** AI Chat block (fixed this session), potentially Video block iframe.
**Recommended rule:** **WEBVIEW-PERSIST-1** — Never use a changing `key` prop on `<webview>` or `<iframe>`. If multiple sources share one container, render all and hide inactive ones with `visibility: hidden`. Add `keepMounted: true` to BlockRegistry for any block containing webviews.

### 2. **Global-to-Daily Storage Migration** (NEW)
**Pattern:** Changing a block from global to daily-scoped storage requires a one-time migration to copy existing data to the current date's key.
**Instances:** Sticky notes (migrated this session).
**Recommended rule:** **STORAGE-MIGRATION-1** — When changing a block's storage scope (global ↔ daily), write a `migrateFooToBar()` function gated by a flag in GLOBAL_KEYS. Call it at App boot before first render.

### 3. **Dual-Source UI Components** (Observation)
**Pattern:** Components that switch between two data sources (Claude/ChatGPT, camera/screen) risk losing state when the switch unmounts one source.
**Existing coverage:** JW-38 covers hidden media elements. STORE-SYNC-1 covers stream state.
**Gap:** No explicit rule about rendering BOTH sources and hiding the inactive one. This is covered by WEBVIEW-PERSIST-1 above.

---

## Prevention Rules Summary (Active, Prioritized)

### Blocking (Always Check)
| Rule | Summary |
|------|---------|
| JW-30 | `npm run build` is the gate |
| JW-34 | Commit-Before-Delete |
| JW-39 | Input-Focus Guard |
| JW-40 | GLOBAL_KEYS Before First Write |
| GIT-EXEC-1 | Never exec for HTTPS auth |
| JW-26 | Fresh-State-in-Handlers |
| JW-24 | Store-Owns-State Gate |

### High Priority
| Rule | Summary |
|------|---------|
| JW-28 | Resource Cleanup on Unmount |
| JW-38 | Hidden Media in Layout |
| VIDEO-SRCOBJECT-1 | .play() after srcObject |
| JW-25 | Storage Key Type Safety |
| JW-20 | Exhaustive Call-Site Enumeration |
| JW-21 | Invariant-First Fix Design |
| JW-35 | BlockType + Icon Co-Check |
| JW-36 | Sibling-Code Parity |
| JW-37 | Plan-Before-Build Gate |
| WEBVIEW-PERSIST-1 | Never change key prop on webviews (NEW) |
| STORAGE-MIGRATION-1 | Migration function for scope changes (NEW) |

### Medium Priority
| Rule | Summary |
|------|---------|
| JW-16 | Visual Verification Gate |
| JW-31 | pick() Module Scope Frozen |
| JW-32 | Portal + getBoundingClientRect |
| JW-29 | Component Extraction for Hooks in Loops |
| JW-27 | No Lint Suppression Without Justification |
| JW-10 | Cross-Layer Constant Sweep |
| HOOK-DATE-SCOPE-1 | Subscribe to activeDate |
| STORE-SYNC-1 | Update store after shared state mutation |
| RTMP-Stop-Safe | isStopping flag guard |

---

## Recommendations

1. **Add WEBVIEW-PERSIST-1 and STORAGE-MIGRATION-1 to CLAUDE.md** — These two new rules address gaps found in this audit.

2. **Automated pre-commit check**: Consider a simple script that runs `npm run build` as a git pre-commit hook to enforce JW-30 automatically.

3. **Storage key registry**: Consider a TypeScript enum or const object for all known storage keys (beyond GLOBAL_KEYS) to catch typos at compile time.

4. **Test matrix for media blocks**: Video-capture, YouTube Studio, and AI Chat blocks have the highest bug density. A manual test checklist for these blocks before each release would catch regressions.

5. **Resource lifecycle audit**: JW-28 (cleanup on unmount) should be checked proactively for any component using `createObjectURL`, `getUserMedia`, `setInterval`, or `addEventListener` on `document`/`window`.
