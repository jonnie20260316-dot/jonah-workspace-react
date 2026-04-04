# Lessons Locked — 2026-04-04 (Session 3) — RTMP Stream Race Condition

**Date:** 2026-04-04  
**Session:** YouTube Studio block — broadcast selection UI + RTMP streaming fix  
**Discovered by:** Claude Code (user reported "停止推流 doesn't work")  

---

## Mistakes Extracted

### Mistake 1: RTMP Stream Write After End Error on Stop

**When:** User tested "停止推流" (Stop Streaming) button after selecting a broadcast

**What:** JavaScript error crash in Electron main process:
```
Uncaught Exception: Error [ERR_STREAM_WRITE_AFTER_END]
write after end
  at _write (node:internal/streams/writable:487:11)
  at /Users/jonnie/jonah-workspace-react/electron/main.cjs:451:30
  at Writable.write (node:internal/streams/writable:508:10)
  at Session.<anonymous> (node:events:478:28)
```

**Why:** Race condition between async IPC handlers in Node.js streams
- User clicks "停止推流" → `youtube:stop-stream` handler calls `ffmpegProcess.stdin.end()` at line 470
- Meanwhile, React renderer still sends MediaRecorder chunks → `youtube:stream-chunk` handler tries to write at line 451
- If chunk arrives AFTER `stdin.end()` but BEFORE process fully closes, Node.js throws `ERR_STREAM_WRITE_AFTER_END`
- Stream contract: once `.end()` is called, no more `.write()` calls allowed; any write → error

**Impact:** Cannot stop streaming without crashing Electron main process. FFmpeg continues running as zombie process. User stuck.

---

## Root Causes

### Root Cause 1: No Synchronization Between Stop and Data Handlers

**Category:** Logic gap (flawed design assumption)

**Details:**
- `youtube:stream-chunk` writes to stdin: `ffmpegProcess.stdin.write(buf)` at line 451
- `youtube:stop-stream` closes stdin: `ffmpegProcess.stdin.end()` at line 470
- Guard at line 447 checks `ffmpegProcess.stdin.destroyed`, but `destroyed` flag is set **after** the stream error, not **before** `.end()` is called
- Electron IPC handlers are asynchronous — chunk handler and stop handler can fire concurrently
- Renderer sends chunks in a `setInterval` loop; stop doesn't cancel that loop instantly

**Why It Happened:**
- Design assumed: stop → immediately stop chunks → then close stdin
- Reality: IPC messages are queued; chunks may already be in flight when stop is received
- The `.destroyed` check is a **reactive** guard (post-error), not a **proactive** one (pre-stop)
- No explicit flag to signal "stopping in progress" across async boundaries

### Root Cause 2: No Error Handling on Stream Write

**Category:** Missing safety net

**Details:**
- `youtube:stream-chunk` handler has try-catch at line 460, but it only logs errors
- If write throws, the catch swallows the error — doesn't escalate or halt the pipeline
- No distinction between recoverable errors (backpressure) and fatal ones (stream closed)

---

## Prevention Rules (New)

### RTMP-Stop-Safe: Async Stream Stop Pattern

**Rule ID:** Candidate for `JW-4X` (async IPC handler synchronization)

**Trigger:** Whenever an IPC handler initiates resource cleanup (`.end()`, `.close()`, `.kill()`) and another handler can still send data to that resource

**Checklist — Before Writing IPC Stop Handler:**
1. Identify the "data sender" handler (e.g., `youtube:stream-chunk`)
2. Identify the "stopper" handler (e.g., `youtube:stop-stream`)
3. Add a boolean flag at module scope: `let isStopping = false;`
4. In the stopper, set flag **before** calling `.end()`: `isStopping = true;`
5. In the data sender, guard before every write: `if (isStopping) return;`
6. Reset flag ONLY after process fully exits or new process starts
7. Document the pattern: `// Race condition guard: chunk handler blocked during stop`

**Checklist — Code Review:**
1. Is there a flag (`isStopping`, `isClosing`, etc.) in the stop handler?
2. Does the data handler check this flag on EVERY data send path?
3. Is the flag reset in the right place (process exit, not just in catch)?
4. Are there timing windows where chunks could still arrive after stop is initiated?

**Escape Hatch (if prevention fails):**
- Wrap stream `.write()` in try-catch
- Catch `ERR_STREAM_WRITE_AFTER_END` explicitly and log (don't crash)
- Example:
  ```javascript
  try {
    ffmpegProcess.stdin.write(buf);
  } catch (err) {
    if (err.code === 'ERR_STREAM_WRITE_AFTER_END') {
      console.debug('Chunk arrived after stream closed; dropping');
    } else {
      throw err; // re-throw unexpected errors
    }
  }
  ```

---

## Integration Points

### Applied Fix Location

**File:** `electron/main.cjs`

**Changes:**
- Line 372: Added `let isStopping = false;`
- Line 389: `isStopping = false;` in start handler (reset before new stream)
- Line 447: Guard before write: `if (isStopping || !ffmpegProcess...) return;`
- Line 466: `isStopping = true;` in stop handler (before `.end()`)
- Line 476: `isStopping = false;` in timeout callback (after process fully exits)

### Future Code Patterns to Audit

- **VideoCaptureBlock → YouTubeStudioBlock stream sharing** — check for similar race conditions
- **Screen capture handlers** — if they have start/stop patterns, apply same guard
- **Any child process with stdin/stdout piping** — potential for similar write-after-end issues
- **Recorder MediaRecorder + Electron IPC** — check if chunk loop respects stop signal

---

## Testing Validation

**Regression Test:**
1. Open YouTube Studio block → click create broadcast form → create one
2. Click the new broadcast → "開始預覽" (not needed, but optional)
3. Open VideoCaptureBlock → start camera capture
4. Go back to YouTube Studio → click "▶ 開始推流" (Start Streaming)
5. **Immediately** click "■ 停止推流" (Stop Streaming) — don't wait for chunks
6. **Expected:** Status changes to "已停止" (Stopped), no errors, FFmpeg exits cleanly
7. **Repeat 5x** to catch timing variations

**Why This Matters:**
- This bug is **non-deterministic** — only manifests when chunks are in flight at the exact moment stop is called
- Users will hit it under normal operation (impatient clicking)
- Manual testing only sometimes catches it; recommend stress test

---

## Summary

| Aspect | Details |
|--------|---------|
| **Mistake** | RTMP stream crashes on stop (`ERR_STREAM_WRITE_AFTER_END`) |
| **Root Cause** | No synchronization flag between async IPC handlers; `.destroyed` check is reactive, not proactive |
| **Prevention** | Add `isStopping` flag; guard data handler before every write |
| **Fix Applied** | Added flag + guards in `electron/main.cjs` (commit `754553b`) |
| **Testing** | Manual user test passed; recommend automated stress test |
| **Escalation** | Consider as pattern for all async stream cleanup in Electron |

**Lesson for Next Agent:**
When multiple IPC handlers touch the same Node.js stream, use a proactive synchronization flag, not reactive stream state checks. Stream `.destroyed` is set **after** the error; a boolean flag is set **before** the cleanup, blocking new data earlier.
