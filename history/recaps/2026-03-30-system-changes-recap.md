# System Changes Recap — 2026-03-30

## Sources Scanned

1. `~/.codex/memories/2026-03-30.md` — today's daily memory (written earlier in session)
2. `~/.codex/memories/2026-03-30-lessons-locked.md` — lessons from earlier work
3. `~/.codex/memories/2026-03-29.md` — prior day context
4. `~/codex-shared-home/` — new repo, cloned and bootstrapped today
5. `~/.local/bin/` — global command shortcuts now installed
6. `~/.openclaw/workspace/MEMORY.md` — prior durable memory anchor

## What Changed

### codex-shared-home Bootstrap

**Status: LIVE**

- Cloned `JonahCreate/codex-shared-home` to `~/codex-shared-home` (HTTPS — SSH host key not trusted)
- First-time `apply` ran: shared baseline synced into `~/.codex/` and `~/.claude/`, skill symlinks rebuilt across `~/.gemini/skills/`, `~/.openclaw/skills/`, `~/.claude/skills/`
- Global commands installed: `codex-pull`, `codex-push`, `codex-status`, `skills-pull`, `skills-push`, `skills-status` → all live in `~/.local/bin/` (already on PATH)

### Local-Only Baseline Published

**Status: LIVE — now in shared repo**

- `folder-organizer` skill was local-only; now committed and pushed to shared repo
- `portableignore` patched to exclude `*.pma` and `golem_memory/` (Chrome binary state from golem backup that caused rsync exit 23)

## Lessons Locked (This Session)

### New — SSH Host Key Not Trusted

- HTTPS fallback worked fine; note that `git push` from this machine will need SSH or PAT auth eventually
- For now, HTTPS with gh CLI token is sufficient

### Reinforced — portableignore Must Stay Ahead of Binary State

- The golem backup in `~/.codex/memories/` is all Chrome runtime files, not durable memory
- Added `*.pma` and `golem_memory/` to `portableignore` to keep the shared repo clean
- Rule: before running `codex-push`, scan `memories/` for non-portable subdirs and ensure they are in `portableignore`

## What Stayed Out Of Scope

- Golem backup Chrome state (`project-golem-backup-20260319-020004/`) — intentionally excluded from shared push; Chrome runtime state is machine-local
- SSH key setup — deferred; HTTPS works for now

## Durable Memory Updated

- `~/.codex/memories/2026-03-30.md` — codex-shared-home bootstrap lane added
- `~/.openclaw/workspace/MEMORY.md` — session entry to be added (see below)

## Promote Later

No new candidate lanes this session. Work was operational (bootstrap + push).
