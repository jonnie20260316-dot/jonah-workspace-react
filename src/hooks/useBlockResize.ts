import { useEffect } from "react";
import type { RefObject } from "react";
import { useBlockStore } from "../stores/useBlockStore";
import { useSessionStore } from "../stores/useSessionStore";
import { GRID } from "../constants";
import { snapValue, clampBlockBounds } from "../utils/viewport";

type ResizeDirection = "nw" | "ne" | "sw" | "se";

interface ResizeState {
  startX: number;
  startY: number;
  baseX: number;
  baseY: number;
  baseW: number;
  baseH: number;
  boardW: number;
  boardH: number;
}

/**
 * Hook to enable resize from a specific corner.
 * Attaches pointer listeners to the given ref (a resize handle div).
 * Resize is RAF-throttled, snapped to grid if enabled, and clamped to board bounds.
 */
export function useBlockResize(
  blockId: string,
  direction: ResizeDirection,
  handleRef: RefObject<HTMLDivElement | null>
): void {
  const updateBlock = useBlockStore((s) => s.updateBlock);
  const { snapMode } = useSessionStore();

  useEffect(() => {
    const el = handleRef.current;
    if (!el) return;

    let resizeState: ResizeState | null = null;
    let rafId: number | null = null;

    const onPointerDown = (e: PointerEvent) => {
      // Read current block from store at resize start (not from stale closure)
      const block = useBlockStore.getState().blocks.find((b) => b.id === blockId);
      if (!block) return;

      resizeState = {
        startX: e.clientX,
        startY: e.clientY,
        baseX: block.x,
        baseY: block.y,
        baseW: block.w,
        baseH: block.h,
        boardW: 20000,
        boardH: 15000,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!resizeState) return;

      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        if (!resizeState) return;

        const deltaX = e.clientX - resizeState.startX;
        const deltaY = e.clientY - resizeState.startY;

        let newX = resizeState.baseX;
        let newY = resizeState.baseY;
        let newW = resizeState.baseW;
        let newH = resizeState.baseH;

        // Calculate new dimensions based on resize direction
        switch (direction) {
          case "nw": // northwest: all change
            newX += deltaX;
            newY += deltaY;
            newW -= deltaX;
            newH -= deltaY;
            break;
          case "ne": // northeast: y, w, h change
            newY += deltaY;
            newW += deltaX;
            newH -= deltaY;
            break;
          case "sw": // southwest: x, w, h change
            newX += deltaX;
            newW -= deltaX;
            newH += deltaY;
            break;
          case "se": // southeast: w, h change
            newW += deltaX;
            newH += deltaY;
            break;
        }

        // Apply snap
        newX = snapValue(newX, GRID, snapMode);
        newY = snapValue(newY, GRID, snapMode);
        newW = snapValue(newW, GRID, snapMode);
        newH = snapValue(newH, GRID, snapMode);

        // Apply clamp
        const clamped = clampBlockBounds(
          newX,
          newY,
          newW,
          newH,
          { w: resizeState.boardW, h: resizeState.boardH }
        );

        updateBlock(blockId, {
          x: clamped.x,
          y: clamped.y,
          w: clamped.w,
          h: clamped.h,
        });
      });
    };

    const onPointerUp = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      resizeState = null;
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
  }, [blockId, snapMode, updateBlock, direction]);
}
