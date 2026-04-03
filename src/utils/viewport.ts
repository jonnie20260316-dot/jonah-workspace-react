import { MIN_ZOOM, MAX_ZOOM, VIEWPORT_PADDING } from "../constants";
import type { ViewportState, BoardSize } from "../types";

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

export function normaliseViewport(
  raw: Partial<ViewportState>
): ViewportState {
  return {
    x: Number(raw?.x ?? 700) || 0,
    y: Number(raw?.y ?? 120) || 0,
    scale: clamp(Number(raw?.scale ?? 1) || 1, MIN_ZOOM, MAX_ZOOM),
  };
}

export function getViewportBounds(boardSize: BoardSize, scale: number) {
  const pad = VIEWPORT_PADDING / scale; // scale-aware
  return {
    minX: -pad,
    maxX: boardSize.w + pad,
    minY: -pad,
    maxY: boardSize.h + pad,
  };
}

export function clampViewport(
  vp: ViewportState,
  boardSize: BoardSize
): ViewportState {
  const { minX, maxX, minY, maxY } = getViewportBounds(
    boardSize,
    vp.scale
  );
  return {
    ...vp,
    x: clamp(vp.x, minX, maxX),
    y: clamp(vp.y, minY, maxY),
  };
}

export function screenToBoardPoint(
  screenX: number,
  screenY: number,
  vp: ViewportState,
  viewportRect: DOMRect
) {
  return {
    x: vp.x + (screenX - viewportRect.left) / vp.scale,
    y: vp.y + (screenY - viewportRect.top) / vp.scale,
  };
}

/**
 * Snap value to grid. Rounds to nearest GRID multiple when snapMode is enabled.
 */
export function snapValue(value: number, grid: number, enabled: boolean): number {
  if (!enabled) return value;
  return Math.round(value / grid) * grid;
}

/**
 * Clamp block position and size within board bounds.
 * Blocks can reach any edge of the infinite canvas (no margin).
 */
export function clampBlockBounds(
  x: number,
  y: number,
  w: number,
  h: number,
  boardSize: BoardSize
): { x: number; y: number; w: number; h: number } {
  const minX = 0;
  const maxX = boardSize.w - w;
  const minY = 0;
  const maxY = boardSize.h - h;

  const minW = 280;
  const maxW = boardSize.w - x;
  const minH = 220;
  const maxH = boardSize.h - y;

  return {
    x: clamp(x, minX, maxX),
    y: clamp(y, minY, maxY),
    w: clamp(w, minW, maxW),
    h: clamp(h, minH, maxH),
  };
}
