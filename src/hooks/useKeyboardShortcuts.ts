import { useEffect } from "react";
import { useSessionStore } from "../stores/useSessionStore";
import { useBlockStore } from "../stores/useBlockStore";
import { useSurfaceStore } from "../stores/useSurfaceStore";
import { useViewportStore } from "../stores/useViewportStore";

function isTextInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLElement && el.contentEditable === "true") return true;
  if (el instanceof HTMLElement && (el.closest("input") || el.closest("textarea"))) return true;
  return false;
}

/**
 * Global keyboard shortcuts for the Edgeless canvas.
 * JW-39: Always checks isTextInputFocused() before acting.
 * Space pan is handled in Canvas.tsx (pointer capture logic); this hook handles the rest.
 */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTextInputFocused()) return;

      const { setActiveTool, clearSelection, selectedIds, setSelectedIds } =
        useSessionStore.getState();
      const { blocks, removeBlock } = useBlockStore.getState();
      const { removeElements } = useSurfaceStore.getState();
      const { stepZoom, zoomTo, fitToContent } = useViewportStore.getState();

      const isMeta = e.metaKey || e.ctrlKey;

      if (!isMeta) {
        switch (e.key) {
          case "v":
          case "V":
            setActiveTool("select");
            break;
          case "h":
          case "H":
            setActiveTool("pan");
            break;
          case "Escape":
            setActiveTool("select");
            clearSelection();
            break;
          case "Delete":
          case "Backspace":
            if (selectedIds.length > 0) {
              e.preventDefault();
              const selectedSet = new Set(selectedIds);
              blocks.forEach((b) => { if (selectedSet.has(b.id)) removeBlock(b.id); });
              removeElements(selectedIds);
              clearSelection();
            }
            break;
        }
        return;
      }

      // Meta / Ctrl shortcuts
      switch (e.key) {
        case "a":
        case "A":
          e.preventDefault();
          setSelectedIds(
            blocks.filter((b) => !b.archived && !b.pinned).map((b) => b.id)
          );
          break;
        case "0":
          e.preventDefault();
          fitToContent(blocks);
          break;
        case "1":
          e.preventDefault();
          zoomTo(1);
          break;
        case "=":
        case "+":
          e.preventDefault();
          stepZoom(1);
          break;
        case "-":
          e.preventDefault();
          stepZoom(-1);
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
