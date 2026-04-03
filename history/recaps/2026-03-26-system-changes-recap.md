# System Changes Recap — 2026-03-26

## Sources Scanned

1. `~/awesome-codex-subagents/README.md` and category tree
2. `~/.codex/agents/` after install
3. `~/.codex/skills/skill-sync/SKILL.md`
4. `~/.gemini/skills/`, `~/.openclaw/skills/`, `~/.claude/skills/`
5. `~/.codex/skill-sync-backups/20260326-003011`
6. `~/.openclaw/workspace/MEMORY.md`
7. `~/.openclaw/workspace/memory/2026-03-26-lessons-locked.md`

## What Changed

### Codex Subagents

**Status: LIVE**

- Cloned `awesome-codex-subagents` to `~/awesome-codex-subagents`
- Confirmed the repo is a Codex `.toml` subagent library, not an executable service
- Installed all 136 subagents globally by linking them into `~/.codex/agents/`

### Skill Sync Repair

**Status: LIVE**

- Audited cross-tool skill registries against canonical `~/.codex/skills/`
- Replaced copied/drifted entries in `~/.gemini/skills`, `~/.openclaw/skills`, and `~/.claude/skills` with canonical symlinks
- Preserved replaced non-symlink OpenClaw entries in `~/.codex/skill-sync-backups/20260326-003011`
- Updated `~/.codex/skills/skill-sync/SKILL.md` so its registry block matches the real canonical skill set as of 2026-03-26

## Verification

- `~/.codex/agents/` contains 136 symlinked `.toml` agents
- Canonical skill names match `~/.gemini/skills` exactly
- Verified sample link targets:
  - Gemini/OpenClaw skill links point to `~/.codex/skills/<name>/SKILL.md`
  - Claude skill links point to `~/.codex/skills/<name>`

## Lessons Locked

- Added **Rule 29 — Home Registry Write Escalation** to `~/.openclaw/workspace/memory/2026-03-26-lessons-locked.md`
- Meaning: writes under `~/.codex`, `~/.gemini`, `~/.openclaw`, and `~/.claude` should be treated as approval-bound registry work, not ordinary workspace edits

## What Stayed Out Of Scope

- Did not remove non-canonical extras that may still have their own purpose:
  - `~/.openclaw/skills/.system`
  - `~/.openclaw/skills/memory-renewal.backup-20260324-014137`
  - `~/.claude/skills/notebooklm`

## Durable Memory Updated

- Added a new 2026-03-26 session entry to `~/.openclaw/workspace/MEMORY.md`
- Added Rule 29 to the active prevention rules

## Promote Later

No promote-later file was needed for this session. The work was operational cleanup plus an immediate Codex capability install, not a staged candidate system.
