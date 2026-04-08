# Session Protocol — Wrap It Up

Triggered when user says **"wrap it up"**, **"收工"**, or **"總結"**.

Run these steps in order:

## Step 1 — Write Session Recap

Create: `history/recaps/YYYY-MM-DD-session-recap.md`

Put this metadata block near the top:

```
Requested by: [User | Codex | Claude Code | Antigravity | Other agent | Unknown]
Executed by: [User | Codex | Claude Code | Antigravity | Other agent | Unknown]
Wrap-up written by: [User | Codex | Claude Code | Antigravity | Other agent | Unknown]
```

Include:
- What was worked on (lane summary, not every micro-turn)
- What shipped (files changed, features added, bugs fixed)
- What is still in progress or pending
- Key decisions made

## Step 2 — Write Lessons Locked (if mistakes happened)

If errors, wrong approaches, or corrections occurred, create:
`history/lessons/YYYY-MM-DD-lessons-locked.md`

If no mistakes: skip this file.

## Step 3 — Update WORKSPACE-LOG.md

Append one line to `history/WORKSPACE-LOG.md`:
```
YYYY-MM-DD | [one-sentence summary of what happened]
```

## Step 4 — Update Prevention Rules (if new)

If Step 2 produced new rules, add them to `PREVENTION_RULES.md` and the summary table in `CLAUDE.md`.

## Step 5 — Commit and Push

```bash
git add history/ CLAUDE.md PREVENTION_RULES.md
git commit -m "session wrap-up YYYY-MM-DD: [short description]"
git push
```
