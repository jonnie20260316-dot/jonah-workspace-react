# 2026-04-04 Lessons Locked: Data Persistence Fixes

## Mistakes Extracted

### Mistake 1: Incorrect await on non-Promise function
**When:** Adding `session.defaultSession.flushStorageData()` to `electron/main.cjs`  
**What:** Typed `await session.defaultSession.flushStorageData()` → TypeScript warning: "`'await' has no effect on the type of this expression`"  
**Why:** Used `await` without verifying the return type. Assumed all async-looking APIs return Promises.  
**Impact:** Minor — warning noise, didn't block build, easily fixed by removing `await`

## Root Causes

### Cause A: Unfamiliar API type signature
The Electron `session.defaultSession.flushStorageData()` API doesn't return a Promise — it's a void synchronous function despite the name suggesting async behavior.

### Cause B: Blind pattern matching
Saw "flush" + "Storage" and assumed async pattern without checking Electron docs or hovering for signature in IDE.

## Prevention Rules

### PERSIST-FLUSH-1
**Trigger:** Adding any Electron session/storage API call  
**Checklist:**
1. Hover function name in IDE to see return type
2. If return type is `void`, do not use `await`
3. If async, verify Promise is not nested in hidden callback
4. Run `npm run build` to catch TypeScript hints before git push

**Escape hatch:** If TypeScript warning appears, check Electron docs for the specific API version used in your `package.json`

## Integration Points

- **File:** `electron/main.cjs` — all new Electron API calls should be verified for type signature
- **Testing:** `npm run build` is the build gate (catches TypeScript hints)
- **Prevention:** Hover all unfamiliar APIs before adding code

## Summary

This was a **minimal mistake with zero impact** (build still passed, warning was just noise). The fix was instant (remove `await`). The lesson is: **always verify API signatures before blindly applying async patterns**. This is especially important in Electron code where many "async-sounding" APIs are actually synchronous.

Not serious enough for its own prevention rule, but a good reminder: **slow down for unfamiliar APIs**.
