import { useRef, useState } from "react";
import type { RefObject } from "react";
import { useSessionStore } from "../stores/useSessionStore";
import { useViewportStore } from "../stores/useViewportStore";
import { useSurfaceStore } from "../stores/useSurfaceStore";
import { screenToBoardPoint } from "../utils/viewport";
import { pointsToSmoothPath, pointsBounds } from "../utils/svgPath";
import type { SurfaceElement } from "../types";

const SHAPE_TOOLS = new Set(["rect", "ellipse", "diamond"]);

function makeShapePreview(type: string, x: number, y: number, w: number, h: number): SurfaceElement {
  return {
    id: "_preview",
    type: type as SurfaceElement["type"],
    x, y, w, h,
    z: 0,
    fillColor: "rgba(79,156,249,0.15)",
    strokeColor: "#4f9cf9",
    strokeWidth: 2,
    strokeStyle: "solid",
    opacity: 1,
  };
}

export function useDrawTool(viewportRef: RefObject<HTMLDivElement | null>) {
  const drawRef = useRef<{ startX: number; startY: number } | null>(null);
  const brushPointsRef = useRef<[number, number][]>([]);
  const [preview, setPreview] = useState<SurfaceElement | null>(null);

  function getBoardPoint(e: React.PointerEvent) {
    const { viewport } = useViewportStore.getState();
    const rect = viewportRef.current!.getBoundingClientRect();
    return screenToBoardPoint(e.clientX, e.clientY, viewport, rect);
  }

  function onPointerDown(e: React.PointerEvent) {
    const { activeTool, setActiveTool, setSelectedIds, setEditingTextId } =
      useSessionStore.getState();
    if (!viewportRef.current) return;

    // Text tool: single click → create element immediately → enter edit mode
    if (activeTool === "text") {
      const b = getBoardPoint(e);
      const id = crypto.randomUUID();
      const el: SurfaceElement = {
        id,
        type: "text",
        x: b.x,
        y: b.y,
        w: 200,
        h: 40,
        z: Date.now(),
        fillColor: "transparent",
        strokeColor: "transparent",
        strokeWidth: 0,
        strokeStyle: "solid",
        opacity: 1,
        text: "",
        fontSize: 18,
        fontWeight: "normal",
        textAlign: "left",
      };
      useSurfaceStore.getState().addElement(el);
      setSelectedIds([id]);
      setEditingTextId(id);
      setActiveTool("select");
      e.stopPropagation();
      return;
    }

    // Brush tool: start collecting points
    if (activeTool === "brush") {
      const b = getBoardPoint(e);
      brushPointsRef.current = [[b.x, b.y]];
      (e.target as Element).setPointerCapture(e.pointerId);
      e.stopPropagation();
      return;
    }

    // Shape tools: record drag start
    if (!SHAPE_TOOLS.has(activeTool)) return;
    const b = getBoardPoint(e);
    drawRef.current = { startX: b.x, startY: b.y };
    (e.target as Element).setPointerCapture(e.pointerId);
    e.stopPropagation();
  }

  function onPointerMove(e: React.PointerEvent) {
    const { activeTool } = useSessionStore.getState();
    if (!viewportRef.current) return;

    // Brush: accumulate points, update live preview
    if (activeTool === "brush" && brushPointsRef.current.length > 0) {
      const b = getBoardPoint(e);
      brushPointsRef.current.push([b.x, b.y]);
      const pts = brushPointsRef.current;
      const { x, y, w, h } = pointsBounds(pts);
      setPreview({
        id: "_preview",
        type: "brush",
        x, y, w, h,
        z: 0,
        fillColor: "transparent",
        strokeColor: "#243231",
        strokeWidth: 3,
        strokeStyle: "solid",
        opacity: 1,
        pathData: pointsToSmoothPath(pts),
      });
      return;
    }

    // Shapes: update bounding-box preview
    if (!drawRef.current) return;
    if (!SHAPE_TOOLS.has(activeTool)) return;

    const b = getBoardPoint(e);
    const x = Math.min(drawRef.current.startX, b.x);
    const y = Math.min(drawRef.current.startY, b.y);
    const w = Math.abs(b.x - drawRef.current.startX);
    const h = Math.abs(b.y - drawRef.current.startY);
    setPreview(makeShapePreview(activeTool, x, y, Math.max(w, 1), Math.max(h, 1)));
  }

  function onPointerUp() {
    const { activeTool, setActiveTool, setSelectedIds } = useSessionStore.getState();

    // Brush: commit stroke
    if (activeTool === "brush") {
      const pts = brushPointsRef.current;
      brushPointsRef.current = [];
      setPreview(null);

      if (pts.length < 2) return;

      const { x, y, w, h } = pointsBounds(pts);
      const id = crypto.randomUUID();
      const el: SurfaceElement = {
        id,
        type: "brush",
        x, y, w, h,
        z: Date.now(),
        fillColor: "transparent",
        strokeColor: "#243231",
        strokeWidth: 3,
        strokeStyle: "solid",
        opacity: 1,
        pathData: pointsToSmoothPath(pts),
      };
      useSurfaceStore.getState().addElement(el);
      setActiveTool("select");
      setSelectedIds([id]);
      return;
    }

    // Shapes: commit element
    if (!drawRef.current) return;
    if (!SHAPE_TOOLS.has(activeTool)) { drawRef.current = null; return; }

    const snap = preview;
    drawRef.current = null;
    setPreview(null);

    if (!snap || snap.w < 10 || snap.h < 10) return;

    const id = crypto.randomUUID();
    const el: SurfaceElement = { ...snap, id, z: Date.now() };
    useSurfaceStore.getState().addElement(el);
    setActiveTool("select");
    setSelectedIds([id]);
  }

  return { onPointerDown, onPointerMove, onPointerUp, preview };
}
