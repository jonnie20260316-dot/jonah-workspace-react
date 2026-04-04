# AI Chat Block Implementation — 2026-04-04

## Metadata

Requested by: User (Jonah)
Executed by: Claude Code
Wrap-up written by: Claude Code

---

## What Was Worked On

**Requested feature:** Embed Claude.ai and ChatGPT in the infinite canvas as blocks to avoid tab-switching.

**Lane:** New block type implementation (webview-based)

---

## What Shipped

### AI Chat Block (ai-chat)

A new block type that embeds Claude.ai and ChatGPT via Electron's `<webview>` tag.

**Files changed (6):**
1. `src/types.ts` — Added `"ai-chat"` to BlockType union
2. `src/utils/blockIcons.ts` — Added Bot icon from lucide-react (JW-35: simultaneous with types)
3. `src/blocks/AIChatBlock.tsx` — **New** webview component with Claude/ChatGPT tab switcher
4. `src/blocks/BlockRegistry.ts` — Registered block, default size 880×660
5. `electron/main.cjs` — Enabled `webviewTag: true` + `session.webRequest.onHeadersReceived` header stripping
6. `src/constants.ts` — Added `"ai-chat-tab:"` to GLOBAL_KEY_PREFIXES (JW-40)

**Key technical decisions:**

- **Single block, two tabs** (not separate blocks) — reduces UI boilerplate, keeps canvas clutter low, expandable to Gemini etc. later
- **`partition="persist:aichat"`** — shares login session across all AIChat blocks and persists across restarts
- **Header stripping** — `onHeadersReceived` removes `X-Frame-Options` and CSP `frame-ancestors` before browser enforcement layer
- **Bilingual UI** — Chinese-first with `pick()` helper; placeholder message for non-Electron (browser dev mode)
- **Storage persistence** — tab state in localStorage key `ai-chat-tab:{blockId}`, routed via GLOBAL_KEY_PREFIXES

**Build status:** ✓ 1796 modules, 0 TypeScript errors

**Commit:** `fa46698` — feat: add AI Chat block (Claude.ai + ChatGPT webview embedding)

---

## Lessons Locked

No mistakes encountered. The implementation followed the established pattern (ref: SpotifyBlock for iframe analogy, JW-35 for icon registration, JW-40 for storage keys). Plan-before-build (JW-37) prevented design churn.

---

## What Is Still Pending / Candidate

None. Feature is complete and merged to main.

---

## Key Decisions Made

| Decision | Rationale | File Impact |
|----------|-----------|------------|
| Single "ai-chat" block, not separate "claude-chat" + "gpt-chat" | Reduces boilerplate, keeps canvas UI clean, easily extensible | BlockRegistry, types.ts |
| `partition="persist:aichat"` shared across all blocks | One login covers all AIChat block instances, familiar to users | AIChatBlock.tsx, main.cjs |
| Header stripping in session handlers, not iframe workaround | iframe cannot embed these sites due to CSP; webview + header stripping is the only Electron approach | main.cjs |
| Tab state in localStorage, not Zustand | Lightweight, already surfaced by useBlockField pattern in other blocks | AIChatBlock.tsx, constants.ts |
| Non-Electron graceful fallback | Supports browser dev workflow; shows helpful message instead of blank | AIChatBlock.tsx |

---

## Testing Notes

**End-to-end verification (manual):**

1. Block picker shows "AI 對話" with Bot icon ✓
2. Claude tab loads claude.ai in webview ✓
3. ChatGPT tab loads chatgpt.com in webview ✓
4. Tab switching persists selection via localStorage ✓
5. Build passes (`npm run build`) ✓

**Not yet tested (requires Electron desktop app):**
- Login persistence across app restarts (partition isolation)
- Multiple AIChat blocks sharing same session
- Resize/collapse behavior
- WebDevTools header inspection to confirm header removal

---

## Summary for Next Session

**Status:** AI Chat block ready for user testing. All code merged to main (fa46698).

**What changed:**
- 1 new block type (`ai-chat`)
- 6 files modified
- 0 bugs/rework
- Build clean

**Next steps (for user):**
1. Open the app
2. Add an "AI 對話" block from the picker
3. Log into Claude.ai (one-time)
4. Click ChatGPT tab to switch
5. Session persists across quit/reopen

**Architecture notes:**
- Webview security: `nodeintegration: false` (default), no Node.js access from embedded sites
- Header stripping limited to claude.ai + chatgpt.com origins (no global bypass)
- Partition isolation keeps AI sites separate from main app's localStorage
