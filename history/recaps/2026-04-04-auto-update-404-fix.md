---
Requested by: User
Executed by: Claude Code
Wrap-up written by: Claude Code
---

# Session Recap — 2026-04-04: Auto-Update 404 Fix

## What Was Worked On

electron-updater failing with 404 when downloading v1.0.3 updates. User reported: "Cannot download" with a 404 status.

## Root Cause

**Filename mismatch across three systems:**
- **Local build**: electron-builder with `productName: Jonah Workspace` produces `Jonah Workspace-1.0.3-arm64-mac.zip` (with space)
- **latest-mac.yml**: References `Jonah-Workspace-1.0.3-arm64-mac.zip` (dash, from space conversion)
- **GitHub Release**: Stores as `Jonah.Workspace-1.0.3-arm64-mac.zip` (dot, from URL encoding of space)

electron-updater constructs the download URL from `latest-mac.yml`. The dash doesn't match the dot → 404.

## Fix

Added explicit `artifactName` to `electron-builder.yml` under `mac:`:

```yaml
artifactName: jonah-workspace-${version}-${arch}-mac.${ext}
```

Now all three systems agree:
- Local: `jonah-workspace-1.0.3-arm64-mac.zip`
- YAML: `jonah-workspace-1.0.3-arm64-mac.zip`
- GitHub: `jonah-workspace-1.0.3-arm64-mac.zip`

## Files Changed

- `electron-builder.yml` — added 1 line (artifactName)

## Build Status

`npm run electron:build:mac` ✓ — new zips built with consistent names. Uploaded to v1.0.3 release. electron-updater should now download without 404.

## Lessons Locked

**Prevention Rule: Electron-Builder Artifact Name**
- **Trigger**: Any time electron-builder is reconfigured or dependencies are updated
- **Checklist**: 
  1. Check `productName` in `electron-builder.yml` — if it contains spaces, you MUST add explicit `artifactName`
  2. `artifactName` should use only lowercase alphanumerics and dashes (no spaces)
  3. After build, verify `latest-mac.yml` URLs match the actual filenames in `release/`
  4. Test: `gh release view <tag> --json assets --jq '.assets[].name'` — URLs from yml should appear in asset list
- **Escape hatch**: If yml URLs don't match assets, delete the release and rebuild with fixed `artifactName`, then re-upload

**Why**: GitHub converts spaces in filenames to dots in URLs. electron-builder's conversion of space→dash doesn't match. This causes silent 404s in electron-updater because the download URL is constructed from the yml, not verified against GitHub.
