# Lessons Locked — Screen Permission Workaround + Electron Release Hygiene

**Date:** 2026-04-06  
**Severity:** Medium

## Mistakes Extracted

### 1. Electron builder config used the wrong shape for notarization
- **What happened:** `electron-builder` rejected `mac.notarize` when it was configured as an object.
- **Impact:** mac packaging stopped before we could validate the release path.
- **Why it happened:** I assumed the notarization config belonged under `mac.notarize.teamId` instead of using the builder's current schema.

### 2. Build validation caught an unrelated missing component
- **What happened:** `npm run build` failed on a pre-existing `Sidebar.tsx` import to `DatePeekModal`, which did not exist in the tree.
- **Impact:** The build gate blocked the permission workaround until the missing component was restored.
- **Why it happened:** The repo had drift between an import and its implementation, and the missing file had not been caught earlier.

## Root Causes

- **Schema mismatch:** release config must follow the exact electron-builder version in use, not a guessed structure.
- **Incomplete repo state:** an import can survive even when its component file has been deleted or never committed.

## Prevention Rules

### EB-RELEASE-SCHEMA-1
- **Trigger:** editing `electron-builder.yml` or any mac release config.
- **Checklist:** verify the exact schema against the installed electron-builder version; run a build immediately after any config change; if the tool reports a config validation error, fix the config shape before touching anything else.
- **Escape hatch:** if the build schema is uncertain, use the smallest possible config change and validate with a local packaging run.

### BUILD-IMPORT-1
- **Trigger:** `tsc` or `vite` fails on a missing import/component.
- **Checklist:** search for every import of the missing symbol; confirm whether the file was deleted, renamed, or never created; restore the implementation or remove the import before re-running the build.
- **Escape hatch:** if the symbol is intentionally pending, stub the component explicitly so the tree stays buildable.

### SCREEN-PERMISSION-1
- **Trigger:** macOS Screen Recording permission is missing after an update and the app is not using paid signing.
- **Checklist:** re-check permission on focus/visibility, show a direct settings button, and phrase the banner as a user-friendly workaround instead of a hard failure.
- **Escape hatch:** if the permission still does not persist, tell the user the free path can only make re-authorization faster; permanent persistence requires signed identity.

## Integration Points

- `electron/main.cjs` for app settings IPC.
- `src/blocks/VideoCaptureBlock.tsx` for the permission banner and refresh logic.
- `README.md` for release/setup notes.
- `electron-builder.yml` for packaging schema validation.
