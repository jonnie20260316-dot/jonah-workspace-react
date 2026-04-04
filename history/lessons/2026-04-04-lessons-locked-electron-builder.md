---
date: 2026-04-04
title: Electron-Builder Artifact Name Mismatch
severity: HIGH
---

# Lessons Locked — Electron-Builder Artifact Name

## Mistake Extracted

**Symptom**: electron-updater fails with 404 when downloading release updates.

**When**: After building v1.0.3 with electron-builder and publishing to GitHub Releases.

**What happened**: 
1. User ran `npm run electron:build:mac`
2. Files were created: `Jonah Workspace-1.0.3-arm64-mac.zip` (with space in filename)
3. `latest-mac.yml` was auto-generated: `url: Jonah-Workspace-1.0.3-arm64-mac.zip` (space→dash conversion)
4. Files were uploaded to GitHub Release
5. GitHub stored them as: `Jonah.Workspace-1.0.3-arm64-mac.zip` (space→dot conversion in URL)
6. electron-updater tried to download using the url from yml: `Jonah-Workspace-...` (dash)
7. GitHub has `Jonah.Workspace-...` (dot) → 404

**Impact**: Blocking — users cannot auto-update the app. Manual DMG installation was the only workaround.

**Error message**: "Cannot download 'https://github.com/.../releases/download/v1.0.3/Jonah-Workspace-1.0.3-arm64-mac.zip', status 404."

---

## Root Cause Analysis

### Knowledge Gap
The developer didn't realize GitHub URL-encodes spaces in filenames to dots (`.`), while electron-builder converts spaces in `productName` to dashes (`-`) in the yml. These two conversions don't match.

### Configuration Gap
No explicit `artifactName` in `electron-builder.yml`. The implicit naming relies on `productName` which contains spaces. Spaces are a source of ambiguity:
- Filesystem: stored as literal space
- electron-builder yml generation: space→dash
- GitHub URL: space→dot

### Verification Gap
No step to verify that `latest-mac.yml` URLs actually exist as files in the GitHub release. The yml was accepted as correct without testing the download URLs.

---

## Prevention Rules

### Rule: EBUILD-1 — Explicit Artifact Names (Always)

**Trigger**: Any `electron-builder.yml` that has a `productName` containing spaces, or before publishing any release.

**Checklist**:
1. [ ] Check `electron-builder.yml` — if `productName` has a space, add explicit `artifactName`:
   ```yaml
   mac:
     artifactName: <lowercase-no-spaces>-${version}-${arch}-mac.${ext}
   ```
2. [ ] Use lowercase alphanumerics and dashes only in `artifactName` (no spaces)
3. [ ] After build, verify: `ls release/ | grep -E "\.(zip|dmg)$"` — should match yml URLs
4. [ ] Before uploading to GitHub, run:
   ```bash
   grep "url:" release/latest-mac.yml | awk '{print $2}' | while read url; do
     [[ -f "release/$url" ]] || echo "MISSING: $url"
   done
   ```
5. [ ] If any urls are missing, rebuild with corrected `artifactName`

**Escape hatch**: If yml URLs don't exist after upload, delete the GitHub release and rebuild with correct `artifactName`, then re-upload. Verify with `gh release view <tag> --json assets --jq '.assets[].name'` — the asset names should exactly match the yml urls.

**Why it works**: Explicit artifact names prevent implicit space→dash/dot conversions. Checking local files before upload catches mismatches early.

---

## Integration Points

### In `electron-builder.yml`
Add this to the `mac:` section as a permanent standard:
```yaml
mac:
  artifactName: jonah-workspace-${version}-${arch}-mac.${ext}
```

(Use package.json `name` field for consistency: `jonah-workspace` is already lowercase-dashed.)

### In CI/CD (if automated releases exist)
Before publishing a release, add a verification step:
```bash
#!/bin/bash
# Verify all latest-mac.yml URLs exist locally
while IFS= read -r url; do
  [[ -f "release/$url" ]] || { echo "MISSING: $url"; exit 1; }
done < <(grep "url:" release/latest-mac.yml | awk '{print $2}')
echo "All artifact URLs verified"
```

### In Release Checklist (CLAUDE.md or procedure doc)
Add: "[ ] Verify electron-builder yml artifact names match GitHub release asset names before publishing"

---

## Test Case That Would Have Caught This

**Manual test** (catches this immediately):
```bash
npm run electron:build:mac
# After build:
grep "url:" release/latest-mac.yml | awk '{print $2}' | sort > yml_urls.txt
ls release/*.zip release/*.dmg | xargs -n1 basename | sort > local_files.txt
diff yml_urls.txt local_files.txt  # Should be empty
```

If this diff had been run, it would have immediately shown:
```
< Jonah-Workspace-1.0.3-arm64-mac.zip
> Jonah Workspace-1.0.3-arm64-mac.zip
```

---

## Development Phase

**Would have been caught in**: Test/QA phase (manual testing of build artifacts) or in CI if a verification step existed.

**Not caught in**: Build phase (electron-builder succeeds), or Design phase (yml generation is automatic).

---

## Related Prevention Rules

- **JW-37** (Plan-Before-Build): Multi-file changes should have a plan. This config change touches build output filenames, which affects the release process → should have had a plan that included "verify yml urls match github assets".
- **JW-30** (Build Gate): `npm run build` must pass. But electron-builder also runs automatically in `npm run electron:build:mac` — no separate step to validate the yml content before uploading.

---

## Recurrence Risk

**HIGH**: This is a configuration-specific mistake that reoccurs whenever:
- Version number is bumped (new release)
- electron-builder is updated
- A new developer touches the release process

Keep this rule in CLAUDE.md or a dedicated electron-builder checklist.
