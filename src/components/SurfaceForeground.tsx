import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { useSurfaceStore } from "../stores/useSurfaceStore";
import { useSessionStore } from "../stores/useSessionStore";
import { useViewportStore } from "../stores/useViewportStore";
import { screenToBoardPoint } from "../utils/viewport";
import { getConnectionPoints, connectorPath } from "../utils/geometry";
import type { SurfaceElement } from "../types";

const TEXT_DRAG_CORNER = 6;

type Corner = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

interface Props {
  viewportRef: RefObject<HTMLDivElement | null>;
  connectorDraft?: { fx: number; fy: number; tx: number; ty: number } | null;
  dragSelectRect?: { x: number; y: number; w: number; h: number } | null;
}

const HANDLE_SIZE = 8;
const CONNECTOR_HIT_WIDTH = 18;

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
 * Renders connectors, selection handles, and snap dots above all blocks.
 */
export function SurfaceForeground({ viewportRef, connectorDraft, dragSelectRect }: Props) {
  const { elements, updateElement } = useSurfaceStore();
  const { selectedIds, setSelectedIds, activeTool, editingTextId } = useSessionStore();

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
  const dragRef = useRef<{
    id: string;
    startBX: number;
    startBY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
    origFromPoint: [number, number];
    origToPoint: [number, number];
  } | null>(null);
  const textDragRef = useRef<{
    id: string;
    startBX: number;
    startBY: number;
    origX: number;
    origY: number;
  } | null>(null);

  function startTextDrag(e: React.PointerEvent<SVGRectElement>, el: SurfaceElement) {
    e.stopPropagation();
    if (activeTool !== "select") return;
    if (!viewportRef.current) return;
    const { viewport } = useViewportStore.getState();
    const rect = viewportRef.current.getBoundingClientRect();
    const b = screenToBoardPoint(e.clientX, e.clientY, viewport, rect);
    textDragRef.current = {
      id: el.id,
      startBX: b.x,
      startBY: b.y,
      origX: el.x,
      origY: el.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelectedIds([el.id]);
  }

  function startConnectorDrag(e: React.PointerEvent<SVGPathElement>, el: SurfaceElement) {
    e.stopPropagation();
    if (activeTool !== "select") return;
    if (!viewportRef.current) return;
    const { viewport } = useViewportStore.getState();
    const rect = viewportRef.current.getBoundingClientRect();
    const b = screenToBoardPoint(e.clientX, e.clientY, viewport, rect);
    const from = (el.fromPoint ?? [el.x, el.y]) as [number, number];
    const to = (el.toPoint ?? [el.x + el.w, el.y + el.h]) as [number, number];
    dragRef.current = {
      id: el.id,
      startBX: b.x,
      startBY: b.y,
      origX: el.x,
      origY: el.y,
      origW: el.w,
      origH: el.h,
      origFromPoint: from,
      origToPoint: to,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelectedIds([el.id]);
  }

  const selectedShapes = elements.filter(
    (el) =>
      selectedIds.includes(el.id) &&
      (el.type === "rect" || el.type === "ellipse" || el.type === "diamond")
  );

  const selectedTexts = elements.filter(
    (el) => selectedIds.includes(el.id) && el.type === "text" && editingTextId !== el.id
  );

  const allShapes = elements.filter(
    (el) => el.type === "rect" || el.type === "ellipse" || el.type === "diamond"
  );

  const connectors = elements.filter((el) => el.type === "connector");

  function onHandlePointerDown(e: React.PointerEvent<SVGRectElement>, el: SurfaceElement, corner: Corner) {
    e.stopPropagation();
    if (useSessionStore.getState().activeTool !== "select") return;
    if (!viewportRef.current) return;
    const { viewport } = useViewportStore.getState();
    const rect = viewportRef.current.getBoundingClientRect();
    const b = screenToBoardPoint(e.clientX, e.clientY, viewport, rect);
    resizeRef.current = {
      id: el.id, corner,
      startBX: b.x, startBY: b.y,
      origX: el.x, origY: el.y,
      origW: Math.max(el.w, 10),
      origH: Math.max(el.h, 10),
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

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (!viewportRef.current) return;
      const { viewport } = useViewportStore.getState();
      const rect = viewportRef.current.getBoundingClientRect();
      const b = screenToBoardPoint(e.clientX, e.clientY, viewport, rect);

      if (textDragRef.current) {
        const { id, startBX, startBY, origX, origY } = textDragRef.current;
        updateElement(id, { x: origX + (b.x - startBX), y: origY + (b.y - startBY) });
        return;
      }

      if (!dragRef.current) return;
      const { id, startBX, startBY, origX, origY, origW, origH, origFromPoint, origToPoint } = dragRef.current;
      const dx = b.x - startBX;
      const dy = b.y - startBY;
      updateElement(id, {
        x: origX + dx,
        y: origY + dy,
        w: origW,
        h: origH,
        fromPoint: [origFromPoint[0] + dx, origFromPoint[1] + dy],
        toPoint: [origToPoint[0] + dx, origToPoint[1] + dy],
        fromId: undefined,
        toId: undefined,
      });
    };

    const onPointerUp = () => {
      dragRef.current = null;
      resizeRef.current = null;
      textDragRef.current = null;
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);

    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
    };
  }, [updateElement, viewportRef]);

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
      <defs>
        <marker
          id="connector-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerUnits="strokeWidth"
          markerWidth="5"
          markerHeight="4"
          orient="auto"
        >
          <path d="M 0 1 L 9 5 L 0 9 Z" fill="#243231" />
        </marker>
      </defs>

      {/* Committed connectors */}
      <g className="surface-connectors">
        {connectors.map((el) => {
          const [fx, fy] = el.fromPoint ?? [el.x, el.y];
          const [tx, ty] = el.toPoint   ?? [el.x + el.w, el.y + el.h];
          const isSelected = selectedIds.includes(el.id);
          return (
            <g key={el.id}>
              <path
                d={connectorPath(fx, fy, tx, ty, el.curveType ?? "curved")}
                fill="none"
                stroke="transparent"
                strokeWidth={Math.max(CONNECTOR_HIT_WIDTH, el.strokeWidth + 14)}
                pointerEvents="stroke"
                style={{ cursor: activeTool === "select" ? "move" : "pointer" }}
                onPointerDown={(e) => startConnectorDrag(e, el)}
              />
              <path
                d={connectorPath(fx, fy, tx, ty, el.curveType ?? "curved")}
                fill="none"
                stroke={isSelected ? "var(--accent, #4f9cf9)" : el.strokeColor}
                strokeWidth={el.strokeWidth}
                opacity={el.opacity}
                markerEnd={el.arrowEnd ? "url(#connector-arrow)" : undefined}
                pointerEvents="none"
              />
            </g>
          );
        })}

        {/* Draft connector while drawing */}
        {connectorDraft && (
          <path
            d={connectorPath(
              connectorDraft.fx, connectorDraft.fy,
              connectorDraft.tx, connectorDraft.ty,
            )}
            fill="none"
            stroke="var(--accent, #4f9cf9)"
            strokeWidth={2}
            strokeDasharray="6 3"
            pointerEvents="none"
          />
        )}
      </g>

      {/* Snap dots — visible when connector tool is active */}
      {activeTool === "connector" && (
        <g className="surface-snap-dots">
          {allShapes.map((el) =>
            getConnectionPoints(el).map((cp) => (
              <circle
                key={`${el.id}-${cp.side}`}
                cx={cp.x}
                cy={cp.y}
                r={5}
                fill="white"
                stroke="var(--accent, #4f9cf9)"
                strokeWidth={1.5}
                pointerEvents="none"
              />
            ))
          )}
        </g>
      )}

      {/* Selection handles for shapes */}
      <g className="surface-selection-handles">
        {selectedShapes.map((el) => (
          <g key={el.id}>
            <rect
              x={el.x - 1}
              y={el.y - 1}
              width={el.w + 2}
              height={el.h + 2}
              fill="none"
              stroke="var(--accent, #4f9cf9)"
              strokeWidth={1.5}
              rx={2}
              style={{ pointerEvents: "none" }}
            />
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

      {/* Drag hit-area + selection outline for text elements */}
      <g className="surface-text-selection">
        {selectedTexts.map((el) => {
          const w = Math.max(el.w, 120);
          const h = Math.max(el.h, 32);
          return (
            <g key={el.id}>
              <rect
                x={el.x - 2}
                y={el.y - 2}
                width={w + 4}
                height={h + 4}
                fill="transparent"
                stroke="var(--accent, #4f9cf9)"
                strokeWidth={1.5}
                strokeDasharray="5 3"
                rx={3}
                style={{ pointerEvents: "all", cursor: "move" }}
                onPointerDown={(e) => startTextDrag(e, el)}
              />
              {/* Corner resize handles */}
              {(["nw", "ne", "se", "sw"] as Corner[]).map((corner, i) => {
                const cxArr = [el.x - 2, el.x + w + 2, el.x + w + 2, el.x - 2];
                const cyArr = [el.y - 2, el.y - 2, el.y + h + 2, el.y + h + 2];
                return (
                  <rect
                    key={corner}
                    x={cxArr[i] - TEXT_DRAG_CORNER / 2}
                    y={cyArr[i] - TEXT_DRAG_CORNER / 2}
                    width={TEXT_DRAG_CORNER}
                    height={TEXT_DRAG_CORNER}
                    rx={1}
                    fill="white"
                    stroke="var(--accent, #4f9cf9)"
                    strokeWidth={1.5}
                    style={{ pointerEvents: "all", cursor: CURSOR_MAP[corner] }}
                    onPointerDown={(e) => onHandlePointerDown(e, el, corner)}
                    onPointerMove={onHandlePointerMove}
                    onPointerUp={onHandlePointerUp}
                  />
                );
              })}
            </g>
          );
        })}
      </g>

      <g className="surface-drag-rect">
        {dragSelectRect && dragSelectRect.w > 2 && dragSelectRect.h > 2 && (
          <rect
            x={dragSelectRect.x}
            y={dragSelectRect.y}
            width={dragSelectRect.w}
            height={dragSelectRect.h}
            fill="rgba(79,156,249,0.07)"
            stroke="var(--accent, #4f9cf9)"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            rx={3}
            pointerEvents="none"
          />
        )}
      </g>
    </svg>
  );
}
