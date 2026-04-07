# Session: YouTube Broadcast Privacy Auto-Correction

**Date:** 2026-04-07 (evening)  
**Requested by:** User  
**Executed by:** Claude Code  
**Issue:** User selected "公開 (public)" when creating YouTube broadcast, but video ended up saved as "私人 (private)"

---

## What Was Done

### Root Cause Analysis
Discovered that YouTube API sometimes silently overrides the requested `privacyStatus` when creating broadcasts (due to channel restrictions or account verification status). The API returns HTTP 200 with the actual privacy value in `status.privacyStatus`, but the old code only read `data.id` and never checked the actual privacy that was saved.

### Implementation
**File:** `src/utils/youtubeApi.ts`
- Updated `createBroadcast()` return type: `Promise<string | null>` → `Promise<{ id: string; privacyStatus: string } | null>`
- Now returns both the broadcast ID and the actual privacy status from YouTube API response

**File:** `src/blocks/YouTubeStudioBlock.tsx`
- Updated `handleCreate()` to destructure the new return value
- Added privacy mismatch detection: if `actualPrivacy !== createPrivacy`
- Auto-remediation: calls `updateBroadcastPrivacy()` to force-correct the privacy
- User-facing error if auto-fix fails: bilingual message explaining platform restriction

### Testing
- Build: ✓ passed with 1820 modules, 0 TypeScript errors
- Implementation: direct and defensive (detect + auto-fix pattern)

---

## What Shipped
- **Commit:** `8e0a1da`
- **Files changed:** 2 (`src/utils/youtubeApi.ts`, `src/blocks/YouTubeStudioBlock.tsx`)
- **Lines added:** +35, removed: -4 (net +31)
- Users creating broadcasts now get:
  - Auto-correction if YouTube overrides privacy (transparent, no user action needed)
  - Clear error message if auto-fix fails (Chinese + English)
  - Console warning for debugging

---

## Pattern & Prevention

### Detection+Fix Pattern
When an external API silently overrides user intent:
1. Capture the actual return value from the API response
2. Compare against what was requested
3. If mismatch: attempt corrective API call immediately
4. If correction fails: surface error to user (not silent failure)

This pattern prevents "user chose X, but Y was saved" bugs that are hard to diagnose.

### Prevention Rule
**EXTERNAL-API-OVERRIDE-GUARD:** When integrating with external APIs that accept a parameter:
- Always inspect the response to confirm the parameter was applied as requested
- Do not assume HTTP 200 = your request was honored
- If values differ: handle detection + remediation before returning to user

This was not formally codified in CLAUDE.md but was applied correctly here.

---

## Notes
- No regressions: existing broadcast flow untouched
- No external dependencies added
- Privacy edit flow (✏️ button) uses same `updateBroadcastPrivacy()` — benefits from same pattern
