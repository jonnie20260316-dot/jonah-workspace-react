---
date: 2026-04-04
title: Squirrel.Mac Bypasses forceDevUpdateConfig — Custom Installer Required
severity: HIGH
---

# Lessons Locked — Squirrel.Mac + Ad-hoc Signing

## Mistake Extracted

**Wrong comment and assumption in code:**
```javascript
autoUpdater.forceDevUpdateConfig = true; // skip macOS code-signature check for ad-hoc signed apps
```
This comment was wrong. `forceDevUpdateConfig` does NOT skip any signature check.

**Symptom:** Clicking "立即重啟安裝" triggered:
> "Code signature at URL file:///Users/jonnie/Library/Caches/... did not pass validation: code failed to satisfy specified code requirement(s)"

**What led to it:** The electron-updater docs describe `forceDevUpdateConfig` near signature-related configuration, creating a false association. The option only controls `isUpdaterActive()` — whether the updater runs at all in dev/unpackaged builds.

---

## Root Cause

**The real path:** `autoUpdater.quitAndInstall()` → `MacUpdater.doInstall()` → `nativeUpdater.setFeedURL()` + `nativeUpdater.quitAndInstall()` → **Squirrel.Mac** (Apple's native update framework built into Electron) → macOS Security framework `codesign --verify`.

Squirrel.Mac requires the downloaded app to satisfy the running app's code requirement. For ad-hoc signed apps, the code requirement is the unique hash of the current binary. A new build always has a different hash → always fails. No flag in electron-updater bypasses this — it's a native macOS OS-level check.

---

## Prevention Rules

### SQUIRREL-BYPASS-1 — Never use `quitAndInstall()` for ad-hoc signed apps

**Trigger:** Any Electron app on macOS that uses ad-hoc signing (no Developer ID cert). Building with electron-builder without `identity:` in `electron-builder.yml`.

**Checklist:**
1. [ ] Check `electron-builder.yml` — if `mac.identity` is absent or empty, you MUST use the custom installer
2. [ ] Capture `downloadedFile` from the `update-downloaded` event: `autoUpdater.on('update-downloaded', (info) => { downloadedFilePath = info.downloadedFile; })`
3. [ ] In `updater:install` handler, DO NOT call `autoUpdater.quitAndInstall()`
4. [ ] Use the ditto installer pattern (see `electron/main.cjs` for the canonical implementation):
   ```bash
   set -e
   mkdir -p "${tmpDir}"
   unzip -q "${zipPath}" -d "${tmpDir}"
   NEW_APP=$(find "${tmpDir}" -name "*.app" -maxdepth 1 | head -1)
   [ -z "$NEW_APP" ] && rm -rf "${tmpDir}" && exit 1
   ditto "$NEW_APP" "${appPath}"
   xattr -dr com.apple.quarantine "${appPath}" 2>/dev/null || true
   rm -rf "${tmpDir}"
   open "${appPath}"
   ```
5. [ ] Use `app.quit()` (not `app.exit(0)`) after install — fires `before-quit` to close HTTP server first

**Escape hatch:** If `ditto` fails (permissions), show an error message and direct user to download the DMG manually from GitHub releases.

### SQUIRREL-AUDIT-1 — Audit installer before first test (checklist)

When implementing any new install/update path in Electron, audit these before testing:

1. Does the install script handle empty `find` results?
2. Is tmpDir cleaned up on ALL exit paths (success AND failure)?
3. Does `app.exit()` vs `app.quit()` matter for any open servers or resources?
4. Will quarantine flags affect the installed app on relaunch?
5. Is there any user-visible feedback during a potentially long operation?

---

## Integration Points

### `electron/main.cjs`
- `downloadedFilePath` captured in `update-downloaded` handler
- `updater:install` handler uses custom ditto installer
- `app.quit()` at end (not `app.exit(0)`)
- `before-quit` also runs deferred install if `deferInstall` flag is set

### For future Developer ID signing
When the app gets a proper Apple Developer ID cert:
- Add `identity: "Developer ID Application: ..."` to `electron-builder.yml`
- Squirrel.Mac will work again via `quitAndInstall()`
- The custom installer can be kept as fallback or removed

---

## Related Rules
- **EBUILD-1**: Artifact names must be explicit to avoid filename mismatch 404s
- **JW-37**: Plan before multi-file changes — the audit step caught 5 bugs before testing
