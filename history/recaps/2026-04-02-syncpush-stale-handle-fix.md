# Session Recap — 2026-04-02 (syncPush Stale Handle Fix)

Requested by: User
Executed by: Claude Code
Wrap-up written by: Claude Code

## What Was Worked On

User reported `syncPush error: NotFoundError` in browser console when pushing sync data. The sync file handle stored in IndexedDB pointed to a file that had been moved or deleted since the last successful push.

## What Shipped

**Bug fix: stale file handle recovery in `syncPush`** (1 file, 6 lines added)

- Added `NotFoundError` handler in the `syncPush` catch block
- On stale handle: clears handle from IndexedDB, nulls in-memory variable, shows Chinese/English toast ("同步檔案不存在，請重新選擇")
- Next push attempt opens the file picker cleanly (handle fully cleared)
- Pattern mirrors existing guard in `syncPull` (lines ~8658–8664)

## Files Changed

- `workspace.html` — syncPush catch block (~line 8632)

## Key Decisions

- Followed the existing `syncPull` stale-handle pattern for consistency
- No new prevention rule needed — this was a missing guard, not a pattern violation

## Still Pending

- Secondary console warning (`Unsafe attempt to load URL file:///...`) — cosmetic iframe issue, likely Spotify block with empty src. Tracked separately, low priority.
