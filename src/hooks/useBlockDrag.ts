import { useEffect } from "react";
import type { RefObject } from "react";
import { useBlockStore } from "../stores/useBlockStore";
import { useSessionStore } from "../stores/useSessionStore";
import { useViewportStore } from "../stores/useViewportStore";
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
      // Read current block position from store at drag start (not from stale closure)
      const block = useBlockStore.getState().blocks.find((b) => b.id === blockId);
      if (!block) return;

      dragState = {
        startX: e.clientX,
        startY: e.clientY,
        baseX: block.x,
        baseY: block.y,
        blockW: block.w,
        blockH: block.h,
        boardW: 20000,
        boardH: 15000,
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
      });
    };

    const onPointerUp = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
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
  }, [blockId, snapMode, updateBlock]);
}
