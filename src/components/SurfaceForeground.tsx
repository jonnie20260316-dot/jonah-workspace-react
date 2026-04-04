import { useRef } from "react";
import type { RefObject } from "react";
import { useSurfaceStore } from "../stores/useSurfaceStore";
import { useSessionStore } from "../stores/useSessionStore";
import { useViewportStore } from "../stores/useViewportStore";
import { screenToBoardPoint } from "../utils/viewport";
import type { SurfaceElement } from "../types";

type Corner = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

interface Props {
  viewportRef: RefObject<HTMLDivElement | null>;
}

const HANDLE_SIZE = 8;

const CURSOR_MAP: Record<Corner, string> = {
  nw: "nw-resize", n: "n-resize", ne: "ne-resize", e: "e-resize",
  se: "se-resize", s: "s-resize", sw: "sw-resize", w: "w-resize",
};

function getHandles(el: SurfaceElement): Array<{ corner: Corner; cx: number; cy: number }> {
  const { x, y, w, h } = el;
  return [
    { corner: "nw", cx: x,       cy: y       },
    { corner: "n",  cx: x + w/2, cy: y       },
    { corner: "ne", cx: x + w,   cy: y       },
    { corner: "e",  cx: x + w,   cy: y + h/2 },
    { corner: "se", cx: x + w,   cy: y + h   },
    { corner: "s",  cx: x + w/2, cy: y + h   },
    { corner: "sw", cx: x,       cy: y + h   },
    { corner: "w",  cx: x,       cy: y + h/2 },
  ];
}

function applyResize(
  corner: Corner,
  dx: number,
  dy: number,
  orig: { x: number; y: number; w: number; h: number }
) {
  let { x, y, w, h } = orig;
  if (corner.includes("w")) { x += dx; w -= dx; }
  if (corner.includes("e")) { w += dx; }
  if (corner.includes("n")) { y += dy; h -= dy; }
  if (corner.includes("s")) { h += dy; }
  w = Math.max(10, w);
  h = Math.max(10, h);
  return { x, y, w, h };
}

/**
 * SurfaceForeground — top SVG layer of the Edgeless whiteboard.
 * Renders selection handles and connectors above all blocks.
 */
export function SurfaceForeground({ viewportRef }: Props) {
  const { elements, updateElement } = useSurfaceStore();
  const { selectedIds } = useSessionStore();

  const resizeRef = useRef<{
    id: string;
    corner: Corner;
    startBX: number;
    startBY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null>(null);

  const selectedShapes = elements.filter(
    (el) =>
      selectedIds.includes(el.id) &&
      (el.type === "rect" || el.type === "ellipse" || el.type === "diamond")
  );

  function onHandlePointerDown(e: React.PointerEvent<SVGRectElement>, el: SurfaceElement, corner: Corner) {
    e.stopPropagation();
    if (!viewportRef.current) return;
    const { viewport } = useViewportStore.getState();
    const rect = viewportRef.current.getBoundingClientRect();
    const b = screenToBoardPoint(e.clientX, e.clientY, viewport, rect);
    resizeRef.current = {
      id: el.id, corner,
      startBX: b.x, startBY: b.y,
      origX: el.x, origY: el.y, origW: el.w, origH: el.h,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onHandlePointerMove(e: React.PointerEvent<SVGRectElement>) {
    if (!resizeRef.current || !viewportRef.current) return;
    const { viewport } = useViewportStore.getState();
    const rect = viewportRef.current.getBoundingClientRect();
    const b = screenToBoardPoint(e.clientX, e.clientY, viewport, rect);
    const { corner, startBX, startBY, origX, origY, origW, origH, id } = resizeRef.current;
    const dx = b.x - startBX;
    const dy = b.y - startBY;
    const updated = applyResize(corner, dx, dy, { x: origX, y: origY, w: origW, h: origH });
    updateElement(id, updated);
  }

  function onHandlePointerUp() {
    resizeRef.current = null;
  }

  return (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        overflow: "visible",
        pointerEvents: "none",
        zIndex: 99999,
      }}
    >
      <g className="surface-connectors" />
      <g className="surface-selection-handles">
        {selectedShapes.map((el) => (
          <g key={el.id}>
            {/* Bounding box outline */}
            <rect
              x={el.x - 1}
              y={el.y - 1}
              width={el.w + 2}
              height={el.h + 2}
              fill="none"
              stroke="var(--accent, #4f9cf9)"
              strokeWidth={1.5}
              strokeDasharray="none"
              rx={2}
              style={{ pointerEvents: "none" }}
            />
            {/* 8 resize handles */}
            {getHandles(el).map(({ corner, cx, cy }) => (
              <rect
                key={corner}
                x={cx - HANDLE_SIZE / 2}
                y={cy - HANDLE_SIZE / 2}
                width={HANDLE_SIZE}
                height={HANDLE_SIZE}
                rx={2}
                fill="white"
                stroke="var(--accent, #4f9cf9)"
                strokeWidth={1.5}
                style={{ pointerEvents: "all", cursor: CURSOR_MAP[corner] }}
                onPointerDown={(e) => onHandlePointerDown(e, el, corner)}
                onPointerMove={onHandlePointerMove}
                onPointerUp={onHandlePointerUp}
              />
            ))}
          </g>
        ))}
      </g>
      <g className="surface-drag-rect" />
    </svg>
  );
}
