# Lessons Locked: 2026-04-03 — Data Loss from Uncommitted Work

## Mistake

The entire Phase 9B/9C, font scaling, calendar fix, and Space pan fix existed only in `/Users/jonnie/jonah-workspace-react` (standalone filesystem copy). When that directory was deleted and replaced with a fresh GitHub clone to reorganize the repo sync, all that work was permanently lost because none of it had been committed or pushed.

**When:** During the "make standalone the primary" repo sync session.
**Impact:** Full re-implementation required — ~6 hours of work reconstructed from recap files.

---

## Root Cause

**Process gap**: There was no gate between "delete a directory" and "verify it's safe to delete."

The developer moved fast to fix the repo sync situation. The instinct was "I'll clone fresh, that gives me the latest." But "latest" in git only means the last-pushed commit. Local-only changes — even an entire afternoon of work — exist only on disk until pushed.

The assumption was that the local copy and the remote were in sync. They were not, because sessions had been done without committing.

---

## Prevention Rule: JW-34 — Commit-Before-Delete

**Rule:** Before deleting or replacing any local directory that could contain uncommitted work, run a two-command safety check. If either shows unsaved local state, push or stash before proceeding.

**Trigger:** Any operation involving `rm -rf`, `git clone` to a location that already has files, or renaming/archiving a working directory.

**Checklist:**
```bash
# Step 1: Check for uncommitted changes
git -C /path/to/dir status

# Step 2: Check for unpushed commits
git -C /path/to/dir log --oneline origin/HEAD..HEAD
```

If `git status` shows modified/untracked files: commit or stash first.
If `git log` shows commits not on origin: push first.
Only proceed with the delete/replace if both show clean.

**Escape Hatch:** If a directory was already deleted and the work is recoverable from session recaps or memory, reconstruct from those artifacts. Keep session recaps detailed enough to reconstruct from.

---

## Secondary Lesson: Recap Quality Saved the Day

Because prior sessions had written detailed `history/recaps/` files with exact file names, line counts, and patterns changed, reconstruction was possible. Without those, the work would have been unrecoverable.

**Reinforced rule:** Always write a recap after meaningful work sessions, especially React/code sessions. Recaps are the backup plan when git is the main plan and the main plan fails.

---

## Integration Points

- Add to wrap-up checklist: "all meaningful changes committed and pushed?"
- Before any repo restructuring: run the two-command safety check above
- When rebuilding Electron DMG: verify you're building from pushed commits, not local-only state

---

## Historical Context

This is the first data-loss incident in this project. The redo took one full session to complete. The prevention check is two commands and takes 5 seconds.
