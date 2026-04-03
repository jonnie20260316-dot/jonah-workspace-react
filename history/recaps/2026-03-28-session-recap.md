# Session Recap — 2026-03-28

## What Was Worked On

### Skill Audit + Gap Analysis
Reviewed existing skills against our actual recurring workflows. Identified that `finishing-a-development-branch` doesn't fit our daily-commit-on-main pattern, and that no skill existed for the 收工 protocol, visual verification, or single-file HTML editing guards.

### 4 New Skills Created
Built and tested four project-specific skills from scratch.

### Skill Testing (8 agents)
Ran parallel with-skill / without-skill tests for the two most behavioural skills. Identified a fix needed in wrap-up skill and applied it.

---

## What Shipped

**Files changed:**
- `/Users/jonah/.claude/skills/workspace-session-wrap-up/SKILL.md` — new skill (6-step 收工 protocol)
- `/Users/jonah/.claude/skills/visual-verification-gate/SKILL.md` — new skill (JW-16 browser verification gate)
- `/Users/jonah/.claude/skills/single-file-html-app-guard/SKILL.md` — new skill (workspace.html editing guards)
- `/Users/jonah/.claude/skills/workspace-daily-commit/SKILL.md` — new skill (replaces finishing-a-development-branch for main-branch workflow)

**Features added:**
- `workspace-session-wrap-up`: triggers on "收工" / "wrap it up", runs 6-step protocol, actually writes files
- `visual-verification-gate`: triggers after UI implementation before "done", opens browser and screenshots
- `single-file-html-app-guard`: front-loads JW-8/JW-10/guard comment rules before any workspace.html edit
- `workspace-daily-commit`: mid-session commits with structured steps, always pushes, reports hash

**Commits:**
- No new commits this session (skills live in ~/.claude/skills, not the workspace repo)

---

## What Is Still Pending

- `visual-verification-gate` and `single-file-html-app-guard` were not formally tested — agreed to test them in the next real editing session and refine if they don't trigger at the right moment
- Description optimisation (run_loop.py) was not run — can do if triggering is unreliable in practice

---

## Key Decisions Made

| Decision | Why |
|----------|-----|
| Create new `workspace-daily-commit` instead of adapting `finishing-a-development-branch` | Our workflow (main branch, no tests, no PRs) is different enough that adapting would produce a worse skill than writing fresh |
| Don't test `visual-verification-gate` and `single-file-html-app-guard` with agents | These are passive guards, not command-triggered skills — real-session observation is more useful than synthetic tests |
| Keep `workspace-session-wrap-up` separate from CLAUDE.md protocol | Skill triggers more reliably than hoping the model reads CLAUDE.md; the fix to add "actually write files" closed the main gap |
| Test design lesson: isolate agents from real git | Agents ran on the live repo and found nothing to commit — future skill tests for git workflows should mock state or instruct agents explicitly not to run real commands |
