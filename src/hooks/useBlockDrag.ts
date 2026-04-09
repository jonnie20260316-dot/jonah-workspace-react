import { useEffect } from "react";
import type { RefObject } from "react";
import { useBlockStore } from "../stores/useBlockStore";
import { useSessionStore } from "../stores/useSessionStore";
import { useViewportStore } from "../stores/useViewportStore";
import { useSurfaceStore } from "../stores/useSurfaceStore";
import { GRID } from "../constants";
import { snapValue, clampBlockBounds } from "../utils/viewport";

interface DragState {
  startX: number;
  startY: number;
  baseX: number;
  baseY: number;
  blockW: number;
  blockH: number;
  boardW: number;
  boardH: number;
  // Multi-select: base positions of all other selected blocks
  multiBlocks?: Record<string, { x: number; y: number; w: number; h: number }>;
}

/**
 * Hook to enable drag repositioning of a block.
 * Attaches pointer listeners to the given ref (usually the block header).
 * Drag is RAF-throttled, snapped to grid if enabled, and clamped to board bounds.
 */
export function useBlockDrag(
  blockId: string,
  headerRef: RefObject<HTMLDivElement | null>
): void {
  const updateBlock = useBlockStore((s) => s.updateBlock);
  const { snapMode } = useSessionStore();

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    let dragState: DragState | null = null;
    let rafId: number | null = null;

    const onPointerDown = (e: PointerEvent) => {
      if (document.body.dataset.panMode) return; // yield to canvas pan (Space held)
      // Read current block position from store at drag start (not from stale closure)
      const block = useBlockStore.getState().blocks.find((b) => b.id === blockId);
      if (!block) return;

      // Capture base positions for all other selected blocks (multi-drag)
      const { selectedIds } = useSessionStore.getState();
      let multiBlocks: Record<string, { x: number; y: number; w: number; h: number }> | undefined;
      if (selectedIds.includes(blockId) && selectedIds.length > 1) {
        const allBlocks = useBlockStore.getState().blocks;
        multiBlocks = {};
        for (const id of selectedIds) {
          if (id === blockId) continue;
          const b = allBlocks.find((bl) => bl.id === id);
          if (b) multiBlocks[id] = { x: b.x, y: b.y, w: b.w, h: b.h };
        }
      }

      dragState = {
        startX: e.clientX,
        startY: e.clientY,
        baseX: block.x,
        baseY: block.y,
        blockW: block.w,
        blockH: block.h,
        boardW: 20000,
        boardH: 15000,
        multiBlocks,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragState) return;

      // Cancel any pending RAF to avoid redundant calls
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        if (!dragState) return;

        const { scale } = useViewportStore.getState().viewport;
        const deltaX = (e.clientX - dragState.startX) / scale;
        const deltaY = (e.clientY - dragState.startY) / scale;

        let newX = dragState.baseX + deltaX;
        let newY = dragState.baseY + deltaY;

        // Apply snap
        newX = snapValue(newX, GRID, snapMode);
        newY = snapValue(newY, GRID, snapMode);

        // Apply clamp
        const clamped = clampBlockBounds(
          newX,
          newY,
          dragState.blockW,
          dragState.blockH,
          { w: dragState.boardW, h: dragState.boardH }
        );

        updateBlock(blockId, { x: clamped.x, y: clamped.y });

        // Move all other selected blocks by the same raw delta
        if (dragState.multiBlocks) {
          for (const [id, base] of Object.entries(dragState.multiBlocks)) {
            const bx = snapValue(base.x + deltaX, GRID, snapMode);
            const by = snapValue(base.y + deltaY, GRID, snapMode);
            const cl = clampBlockBounds(bx, by, base.w, base.h, { w: dragState.boardW, h: dragState.boardH });
            updateBlock(id, { x: cl.x, y: cl.y });
          }
        }
      });
    };

    const onPointerUp = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      if (dragState) {
        // Auto-grouping: check if block center landed inside a frame
        const block = useBlockStore.getState().blocks.find((b) => b.id === blockId);
        if (block) {
          const cx = block.x + block.w / 2;
          const cy = block.y + block.h / 2;
          const frames = useSurfaceStore.getState().elements.filter(
            (el) => el.type === "frame" && !(el.collapsed)
          );
          const hit = frames.find(
            (f) => cx >= f.x && cx <= f.x + f.w && cy >= f.y && cy <= f.y + f.h
          );
          useBlockStore.getState().updateBlock(blockId, { zoneId: hit?.id ?? undefined });
        }
      }
      dragState = null;
    };

    el.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [blockId, snapMode, updateBlock, headerRef]);
}
