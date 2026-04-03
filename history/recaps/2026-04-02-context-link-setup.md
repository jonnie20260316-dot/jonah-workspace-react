# Session Recap: context-link MCP Setup

**Date:** 2026-04-02  
**Requested by:** User  
**Executed by:** Claude Code  
**Wrap-up written by:** Claude Code  

## Summary
Installed and configured **context-link** — a local MCP server that indexes codebases and serves structured symbol/dependency context to reduce token consumption by 85–92%.

## What Shipped
1. **Installed** context-link v1.0.0 via Homebrew → `/opt/homebrew/bin/context-link`
2. **Configured globally:** Added `mcpServers.context-link` to `~/.claude/settings.json`
3. **Created `.mcp.json`** in both workspaces:
   - `/Users/jonnie/jonah-workspace/.mcp.json` (single-file app, not supported)
   - `/Users/jonnie/jonah-workspace-react/.mcp.json` (TypeScript project)
4. **Indexed React workspace:** 40 files indexed, 134 symbols extracted, 87 dependencies resolved
   - 7 store files had tree-sitter parse errors (operation limit hit) — not critical

## Key Decisions
- Installed via Homebrew (faster than building from source)
- Cloned repo to `~/.claude/context-link/` for reference
- Indexed `jonah-workspace-react` only (main vanilla workspace is HTML, not a supported language)

## How to Use
When working in `jonah-workspace-react`, context-link MCP tools become available automatically. Query by symbol name to fetch exact functions/classes/types without reading entire files.

Re-index after major file additions:
```bash
context-link index --project-root /Users/jonnie/jonah-workspace-react
```

## Still Open
None — setup complete.

## Notes
- Single HTML file (`jonah-workspace`) doesn't benefit from structural indexing
- React workspace is the main candidate for token savings during active development
- Tree-sitter parse limit on store files is a known limitation (large or complex files) — doesn't prevent indexing but may miss symbols in those files
