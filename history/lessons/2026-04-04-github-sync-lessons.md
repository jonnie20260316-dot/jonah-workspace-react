# 2026-04-04 Lessons Locked: GitHub REST API Sync Fix

## Mistakes Extracted

### Mistake 1: Edit tool string mismatch on first attempt
**When:** Editing `electron/main.cjs` to replace git handlers
**What:** First Edit attempt failed — `String to replace not found in file`
**Why:** The comment block above `runGit()` differed from what was read earlier. Didn't read the exact surrounding lines before targeting.
**Impact:** One extra read cycle needed; minor delay.

### Mistake 2: git remote still pointing to wrong repo after push
**When:** `git push` after committing the GitHub sync fix
**What:** Push rejected — remote was `jonah-workspace-sync.git` not `jonah-workspace-react.git`
**Why:** The remote was reset during the jonah-workspace-sync cleanup in the previous session but never persisted correctly.
**Impact:** Required `git remote set-url origin` fix; commit landed correctly on second push.

---

## Root Causes

### Cause A: Assuming Edit target without re-reading exact context
Edit tool requires byte-perfect string match. Reading a file earlier in the conversation doesn't guarantee the string is still accurate — especially when file has section headers or comment blocks that weren't fully visible.

### Cause B: Session continuity broke remote config
The jonah-workspace-sync cleanup session changed the remote to wrong repo. The fix was applied but the next session started with the same broken state.

---

## Prevention Rules

### GIT-EXEC-1 (NEW — HIGH)
**Trigger:** Any Electron IPC handler that needs to authenticate with an external service over network.
**Rule:** Never use `child_process.exec` for network operations that require credentials. Use the appropriate HTTP client (Node.js `https`, `fetch`, etc.) with explicit auth headers instead.
**Why:** `exec` cannot handle interactive credential prompts. HTTPS git push hangs until timeout (30s default), causing silent failure and degrading quit-time safety.
**Checklist:**
1. Does the IPC handler call an external API?
2. Does it require auth?
3. If yes → use `https.request` or `fetch` with explicit `Authorization` header
4. Set a reasonable timeout (15s) — never rely on process default

**Escape hatch:** If git binary is truly needed (e.g. local operations only), use SSH with a pre-configured key and `GIT_SSH_COMMAND` env var.

### EDIT-READ-FIRST-1 (NEW — LOW)
**Trigger:** Any Edit targeting a section of a file that was last read more than a few tool calls ago.
**Rule:** Re-read the exact target lines immediately before issuing Edit. Use a targeted Read with offset+limit, not a full file read.
**Why:** File content can shift during the same session (earlier edits, different line endings). Edit requires byte-perfect match.

### REMOTE-URL-1 (reinforcing JW-34) — HIGH
**Trigger:** Starting any push after a session that touched the jonah-workspace-sync repo.
**Rule:** Run `git remote -v` before the first push in each session that involves both repos.
**Why:** The two repos (jonah-workspace-react, jonah-workspace-sync) are easily confused. Getting the remote wrong sends code to the wrong repo silently.

---

## Integration Points

- `electron/main.cjs`: any new IPC handler doing network calls → check GIT-EXEC-1 first
- Before `git push` in wrap-up → verify `git remote -v` shows `jonah-workspace-react`
- Edit on large files → re-read target section immediately before editing

---

## Summary

The core lesson: **`exec` + HTTPS = broken for auth-required operations**. The fix (GitHub REST API with PAT) is the correct permanent solution — single HTTP request, explicit auth header, 15s timeout, immediate success/failure signal. This pattern should be used for any future external API calls from Electron IPC handlers.
