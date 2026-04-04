# Lessons Locked — 2026-04-04

**Date:** 2026-04-04  
**Session:** Beta/Stable Channel + Non-Disruptive Update Flow  
**Severity:** Medium

---

## Mistakes Encountered

### 1. BlockType/BLOCK_ICONS Enum Sync

**When:** During build after implementation  
**Error:** TypeScript build error — `Property 'youtube-studio' is missing in type Record<BlockType, LucideIcon>`  
**Root cause:** The `BlockType` enum in `src/types.ts` had `"youtube-studio"` added (either by IDE or linter), but the corresponding `BLOCK_ICONS` mapping in `src/utils/blockIcons.ts` was not updated.  
**Impact:** Build failed (1 TS error). Blocked progress until fixed.  
**Fix:** Added `"youtube-studio": Play,` to `BLOCK_ICONS`; imported `Play` from lucide-react.

---

## Root Cause Analysis

This is a **type-registry sync problem**: when a discriminated union type (`BlockType`) is defined in one file and a record mapping (`BLOCK_ICONS: Record<BlockType, LucideIcon>`) is defined in another, TypeScript catches missing keys at build time, but the developer must remember to update BOTH files.

**Why it happens:**
- BlockType enum lives in `src/types.ts` (shared across entire app)
- BLOCK_ICONS lives in `src/utils/blockIcons.ts` (isolated)
- No co-location; easy to forget the second step
- IDE refactoring tools don't always catch cross-file type migrations

**What made it worse:**
- The error only surfaced at build time, not during development (no editor error until `npm run build`)
- The `youtube-studio` entry was likely added by an IDE auto-complete or linter, not explicitly by the agent

---

## Prevention Rules

### Rule: BlockType + Icon Registry Co-Check

**Trigger:** Whenever `BlockType` enum changes (add/remove/rename variant)

**Checklist before committing:**
1. Edit `src/types.ts` → BlockType enum
2. **IMMEDIATELY after**, check `src/utils/blockIcons.ts` → BLOCK_ICONS record
3. Verify every variant in BlockType has a corresponding key in BLOCK_ICONS
4. If adding a new block type:
   - Import the icon from lucide-react (check [lucide.dev](https://lucide.dev) for available icons)
   - Add to BLOCK_ICONS record with the icon import
5. Run `npm run build` to verify Record<BlockType, LucideIcon> is fully satisfied

**Escape hatch:** If the build fails with "Property 'X' is missing", immediately:
1. Locate the missing BlockType variant
2. Find a suitable icon from lucide-react or reuse existing import
3. Add to BLOCK_ICONS
4. Re-run `npm run build`

---

## Integration Points

### Development Workflow

Add to the checklist in CLAUDE.md (after the "Definition of Done" section):

```
- [ ] BlockType and BLOCK_ICONS in sync (if you touched BlockType enum, verify BLOCK_ICONS)
```

### Preemptive Check Script

Consider adding to `package.json` a lint script that checks this:

```bash
"lint:block-types": "grep -o \"'[a-z-]*':\" src/types.ts | sort | uniq > /tmp/types.txt && grep -o \"'[a-z-]*':\" src/utils/blockIcons.ts | sort | uniq > /tmp/icons.txt && diff /tmp/types.txt /tmp/icons.txt || (echo 'ERROR: BlockType and BLOCK_ICONS out of sync'; exit 1)"
```

Then add to `npm run lint`:

```bash
"lint": "eslint . && npm run lint:block-types"
```

---

## Summary

✅ **Identified:** Type-registry sync problem (BlockType ↔ BLOCK_ICONS)  
✅ **Root cause:** Cross-file enum migration not co-located  
✅ **Prevention:** Co-check both files before commit; add lint rule to catch sync issues early  
✅ **Recovery:** Add icon import + update BLOCK_ICONS record; rebuild  

**Similar issues to watch for:**
- Block component registration (BlockRegistry.ts must have every BlockType)
- Translation keys (if adding a new block, ensure all 48+ bilingual strings exist)
- Default block sizes (if adding a new block type, BlockRegistry must define dimensions)
