import { create } from "zustand";
import { loadJSON, saveJSON } from "../utils/storage";
import {
  normaliseViewport,
  clampViewport,
  screenToBoardPoint,
} from "../utils/viewport";
import { MIN_ZOOM, MAX_ZOOM, ZOOM_STEP } from "../constants";
import type { ViewportState, BoardSize } from "../types";

interface ViewportStore {
  viewport: ViewportState;
  boardSize: BoardSize;
  setViewport: (vp: ViewportState) => void;
  zoomTo: (
    nextScale: number,
    anchorX?: number,
    anchorY?: number,
    viewportRect?: DOMRect
  ) => void;
  stepZoom: (
    direction: number,
    anchorX?: number,
    anchorY?: number,
    viewportRect?: DOMRect
  ) => void;
  pan: (dx: number, dy: number) => void;
}

export const useViewportStore = create<ViewportStore>((set, get) => ({
  viewport: normaliseViewport(loadJSON("viewport", { x: 700, y: 120 })),
  boardSize: loadJSON("board-size", { w: 20000, h: 15000 }),

  setViewport: (viewport) => {
    const clamped = clampViewport(viewport, get().boardSize);
    saveJSON("viewport", clamped);
    set({ viewport: clamped });
  },

  zoomTo: (nextScale, anchorX, anchorY, viewportRect) => {
    const { viewport, boardSize } = get();
    const scale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextScale));

    const cx = viewportRect
      ? viewportRect.left + viewportRect.width / 2
      : anchorX ?? 0;
    const cy = viewportRect
      ? viewportRect.top + viewportRect.height / 2
      : anchorY ?? 0;

    const pointX = anchorX ?? cx;
    const pointY = anchorY ?? cy;

    const boardPoint = viewportRect
      ? screenToBoardPoint(pointX, pointY, viewport, viewportRect)
      : { x: viewport.x, y: viewport.y };

    const newVp: ViewportState = {
      scale,
      x: boardPoint.x - (pointX - (viewportRect?.left ?? 0)) / scale,
      y: boardPoint.y - (pointY - (viewportRect?.top ?? 0)) / scale,
    };

    // skipClamp on zoom (matching current code's skipClamp: true)
    saveJSON("viewport", newVp);
    set({ viewport: newVp });
  },

  stepZoom: (direction, anchorX, anchorY, viewportRect) => {
    const { viewport, zoomTo } = get();
    const factor = direction > 0 ? 1 + ZOOM_STEP : 1 / (1 + ZOOM_STEP);
    zoomTo(viewport.scale * factor, anchorX, anchorY, viewportRect);
  },

  pan: (dx, dy) =>
    set((s) => {
      const viewport = {
        ...s.viewport,
        x: s.viewport.x + dx,
        y: s.viewport.y + dy,
      };
      const clamped = clampViewport(viewport, s.boardSize);
      saveJSON("viewport", clamped);
      return { viewport: clamped };
    }),
}));
