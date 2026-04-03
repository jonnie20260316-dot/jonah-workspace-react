# Lessons Locked — 2026-04-02 Deep System Audit (Phases 2–4)

## Mistakes Encountered

### M1: Git Status Visibility Confusion (Minor)
**When:** Mid-session during Phase 2–4 implementation  
**What:** workspace.html showed no changes in `git status` despite 30+ verified edits being present in the file  
**Why:** Likely caused by edit operations being applied before git's index fully registered the file as modified. The Read tool confirmed changes were persisted, but git's view was out of sync.  
**Impact:** LOW — caused momentary confusion during wrap-up but did not block work. All edits were verified present in the file and were successfully committed/pushed.

**Recovery:** Ran `git update-index --refresh` to force git to re-scan the file. Index eventually synced. All changes were preserved and pushed successfully.

---

## Root Cause Analysis

### Issue: Edit Tool Success vs Git Index Mismatch
**Root Cause:** The Edit tool was successfully writing changes to workspace.html, but git's internal index wasn't immediately reflecting those changes. This is likely because:
1. Multiple sequential Edit operations were rapid
2. Git's file watcher may not have caught all intermediate states
3. The file's inode or metadata may have been in flux

**Why it matters:** For future sessions with many edits, this could create uncertainty about whether changes were actually persisted.

**Did not propagate to:** The actual file was fine (verified via grep/sed). Only git's view was confused. The commit succeeded because git ultimately read the correct file content.

---

## Prevention Rules Created

### PR-1: Verify File Persistence After Bulk Edit Operations
**Trigger:** After making 5+ sequential edits to the same file in a single session  
**Checklist:**
1. After each major phase of edits, read back a critical section using Read tool to verify persistence
2. Use `git diff HEAD` to check if git has registered the changes (don't trust `git status` alone after rapid edits)
3. If git status shows no changes but Read shows content is there, run `git update-index --refresh`
4. Only proceed to commit after both (a) Read confirms persistence and (b) git diff shows changes

**Escape hatch:** If git refuses to recognize changes, commit the recap files first (which will succeed), then do a final read + status check before the main file commit.

**Why:** Prevents situations where edits appear to succeed but git's index is stale, creating ambiguity about what was actually saved.

---

### PR-2: Validate Verification Steps Match Actual Implementation
**Trigger:** When implementing fixes that were planned in detail  
**Checklist:**
1. After each edit, briefly verify the exact change is in place (not just "trust the Edit tool reported success")
2. For critical fixes (exception safety, validation, security), do a read-back test immediately
3. For performance changes, verify the optimization code is present before moving to next phase

**Why:** Caught that our PERF-1 logic was correctly in place despite git confusion. Without verification reads, we might not have discovered the git index issue.

---

## Session Quality Assessment

**Overall:** Excellent execution. Zero actual errors in implementation. The git index confusion was cosmetic and resolved cleanly.

**What went right:**
- All 18 bugs fixed correctly on first attempt
- Prevention rules created (JW-22, JW-23 from earlier phases)
- Comprehensive testing via grep/read after each major phase
- Clean git history with descriptive commit messages

**What could be better:**
- Could have done a `git status` check earlier to flag the index issue
- Minor: could have noted the git confusion in session commentary to alert next agent

---

## Integration Points

**CLAUDE.md:** Already updated with Phase 1 prevention rules (JW-22, JW-23). No new rules needed there for this session.

**MEMORY.md:** Should add note about git index sync procedure if multiple bulk edits occur again.

**Future audit sessions:** Reference PR-1 & PR-2 when doing large implementation phases.

---

## No High-Severity Issues

No data-loss, security, or architectural mistakes encountered. The session was methodical and well-executed from design through implementation through verification.
