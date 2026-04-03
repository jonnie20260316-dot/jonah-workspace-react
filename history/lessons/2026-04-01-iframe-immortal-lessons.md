# Lessons Locked — 2026-04-01: Spotify Iframe Immortal

## Mistakes Encountered

None in the implementation. Clean path.

The "mistake" was a latent architecture gap from the original Spotify expansion: the preservation code in `renderBoard()` used `iframe.remove()` (full document detach) which is safe for same-origin content but fatal for cross-origin iframes in strict browsers like Safari.

---

## New Prevention Rule: JW-22

### Rule

**Iframe Document Continuity** — when preserving a cross-origin iframe across a DOM rebuild, NEVER call `iframe.remove()` (full detach). Instead, move it to an in-document stash element (`document.body.appendChild(stash); stash.appendChild(iframe)`). Parent-to-parent moves within the live document preserve browsing context. Full removal destroys it.

### Trigger

Any time code does:
```javascript
iframe.remove();        // detach
container.innerHTML = ""; // rebuild
... placeholder.replaceWith(iframe); // reinsert
```
for a cross-origin iframe (Spotify, YouTube, Google Maps, etc.).

### Root Cause

Browser spec: when an iframe is removed from the document (not just moved), its browsing context is unloaded. Reinserting it creates a NEW browsing context → reload. Same-origin iframes may survive because the browser can retain the document in memory, but cross-origin iframes always reload.

### Prevention Checklist

- [ ] Never call `iframe.remove()` before a DOM rebuild if the iframe should survive
- [ ] Use stash pattern: `body > hidden-div > iframe` during rebuild
- [ ] After rebuilding, `placeholder.replaceWith(iframe)` then `body.removeChild(stash)`
- [ ] For `innerHTML` replacements: extract iframe to stash BEFORE setting innerHTML

### Applies To

- `renderBoard()` — any full board rebuild
- `rerenderBlock()` — any single-block innerHTML replacement
- Future: any `appendBlockArticle()` refactor that might touch live iframe blocks

### Recovery (if rule broken)

If iframe reloads: apply stash pattern at the call site. Takes ~10 lines per function.
