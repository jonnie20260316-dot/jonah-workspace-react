import { create } from "zustand";
import { loadJSON, saveJSON } from "../utils/storage";
import {
  normaliseViewport,
  clampViewport,
  screenToBoardPoint,
} from "../utils/viewport";
import { MIN_ZOOM, MAX_ZOOM, ZOOM_STEP } from "../constants";
import type { ViewportState, BoardSize, Block, SurfaceElement } from "../types";

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
  fitToContent: (blocks: Block[]) => void;
  animateToFrame: (frame: SurfaceElement, onDone?: () => void) => void;
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
    const { viewport } = get();
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

  fitToContent: (blocks) => {
    const visible = blocks.filter((b) => !b.archived && !b.pinned);
    if (visible.length === 0) return;
    const padding = 80;
    const minX = Math.min(...visible.map((b) => b.x));
    const minY = Math.min(...visible.map((b) => b.y));
    const maxX = Math.max(...visible.map((b) => b.x + b.w));
    const maxY = Math.max(...visible.map((b) => b.y + b.h));
    const bboxW = maxX - minX + padding * 2;
    const bboxH = maxY - minY + padding * 2;
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;
    const fitScale = Math.min(viewW / bboxW, viewH / bboxH, MAX_ZOOM);
    const centerBoardX = minX - padding + bboxW / 2;
    const centerBoardY = minY - padding + bboxH / 2;
    const newX = centerBoardX - viewW / (2 * fitScale);
    const newY = centerBoardY - viewH / (2 * fitScale);
    const viewport = { x: newX, y: newY, scale: fitScale };
    saveJSON("viewport", viewport);
    set({ viewport });
  },

  animateToFrame: (frame, onDone) => {
    const startVp = { ...get().viewport };
    const padding = 80;
    const bboxW = frame.w + padding * 2;
    const bboxH = frame.h + padding * 2;
    const fitScale = Math.min(
      window.innerWidth / bboxW,
      window.innerHeight / bboxH,
      MAX_ZOOM
    );
    const centerBoardX = frame.x - padding + bboxW / 2;
    const centerBoardY = frame.y - padding + bboxH / 2;
    const targetX = centerBoardX - window.innerWidth / (2 * fitScale);
    const targetY = centerBoardY - window.innerHeight / (2 * fitScale);
    const duration = 400;
    const startTime = performance.now();

    function easeOut(t: number) { return 1 - Math.pow(1 - t, 3); }

    function tick(now: number) {
      const t = Math.min((now - startTime) / duration, 1);
      const e = easeOut(t);
      const newVp = {
        scale: startVp.scale + (fitScale - startVp.scale) * e,
        x: startVp.x + (targetX - startVp.x) * e,
        y: startVp.y + (targetY - startVp.y) * e,
      };
      set({ viewport: newVp });
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        saveJSON("viewport", newVp);
        onDone?.();
      }
    }
    requestAnimationFrame(tick);
  },
}));
