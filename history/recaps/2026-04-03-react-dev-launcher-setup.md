# 2026-04-03 — React Dev Launcher Setup

**Requested by:** User  
**Executed by:** Claude Code  
**Wrap-up written by:** Claude Code

---

## What Was Worked On

Set up three quick-launch methods for the Jonah Workspace React dev server:

1. **Shell alias** (`jw-dev` command)
2. **Launcher script** (executable at `~/.local/bin/jw-react-launcher`)
3. **Updated Automator app** (replaced HTML launcher with React launcher)

## What Shipped

### 1. Shell Alias (Manual Sync)
**File:** `~/.zshrc`

Added two aliases to the user's shell profile:
```bash
alias jw-dev="cd /Users/jonnie/jonah-workspace-react && npm run dev"
alias jw-build="cd /Users/jonnie/jonah-workspace-react && npm run build"
```

**How to sync to other device:**
- Manually copy the two alias lines from `~/.zshrc` to the MacBook's `~/.zshrc`
- Or: if `~/.zshrc` is symlinked to a dotfiles repo, the change syncs automatically

### 2. Launcher Script (Auto-Syncs if in ~/.local)
**File:** `~/.local/bin/jw-react-launcher`

A bash script that:
- Opens Terminal
- Runs `cd /Users/jonnie/jonah-workspace-react && npm run dev`
- Waits 3 seconds for the dev server to start
- Opens Chrome to `http://localhost:5173`

**Sync method:** If `~/.local` is backed up (iCloud, Dropbox, Time Machine), the script syncs automatically. Otherwise, copy the file manually or re-run the setup on the MacBook.

### 3. Automator App (iCloud Sync)
**File:** `~/Library/Mobile Documents/com~apple~Automator/Documents/Jonah's WorkSpace.app`

Updated the existing "Jonah's WorkSpace" Automator app to:
- Call the launcher script instead of opening the old HTML file
- Simplified AppleScript: `do shell script "/Users/jonnie/.local/bin/jw-react-launcher"`

**Sync method:** Automator apps stored in `~/Library/Mobile Documents/` sync automatically via iCloud. No manual action needed — the updated app should appear on the MacBook within minutes.

## Usage

From any terminal:
```bash
jw-dev        # Start React dev server in Terminal + open Chrome
jw-build      # Build React app
```

From Spotlight/Launchpad:
- Open "Jonah's WorkSpace" app (runs the same launcher)

## What's Still Candidate

A Claude Code hook (`UserPromptSubmit`) was discussed but not finalized. The user indicated the shell alias + Automator app are sufficient for now.

---

## MacBook Sync Checklist

- [ ] **Automator app:** Will sync automatically via iCloud in ~1 minute
- [ ] **Launcher script:** Check `~/.local/bin/jw-react-launcher` exists; if not, copy manually from this device
- [ ] **Shell aliases:** Copy `jw-dev` and `jw-build` lines from `~/.zshrc` to MacBook's `~/.zshrc` (or symlink if using dotfiles)

---

## No Mistakes Recorded

Setup was straightforward. No errors or rework needed.

---

## Integration Points

The launcher script (`jw-react-launcher`) is now the single source of truth for the dev server startup sequence. If startup behavior needs to change (e.g., custom port, different browser), update the script in `~/.local/bin/` and both the shell alias and Automator app will pick up the change automatically.
