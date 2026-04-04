import { useRef, useState } from "react";
import type { RefObject } from "react";
import { useSessionStore } from "../stores/useSessionStore";
import { useViewportStore } from "../stores/useViewportStore";
import { useBlockStore } from "../stores/useBlockStore";
import { useSurfaceStore } from "../stores/useSurfaceStore";
import { useHistoryStore } from "../stores/useHistoryStore";
import { screenToBoardPoint } from "../utils/viewport";
import { pointsToSmoothPath, pointsBounds } from "../utils/svgPath";
import { nearestConnectionPoint } from "../utils/geometry";
import { DEFAULT_FRAME_COLOR } from "../constants";
import type { SurfaceElement } from "../types";

const SHAPE_TOOLS = new Set(["rect", "ellipse", "diamond", "frame"]);
const MIN_FRAME_W = 180;
const MIN_FRAME_H = 120;
const CONNECTOR_SNAP_DIST = 50; // board units

function makeShapePreview(type: string, x: number, y: number, w: number, h: number): SurfaceElement {
  const isFrame = type === "frame";
  return {
    id: "_preview",
    type: type as SurfaceElement["type"],
    x, y, w, h,
    z: 0,
    fillColor: isFrame ? "rgba(59,130,246,0.06)" : "rgba(79,156,249,0.15)",
    strokeColor: isFrame ? "#3b82f6" : "#4f9cf9",
    strokeWidth: 2,
    strokeStyle: isFrame ? "dashed" : "solid",
    opacity: 1,
  };
}

export function useDrawTool(viewportRef: RefObject<HTMLDivElement | null>) {
  const drawRef = useRef<{ startX: number; startY: number } | null>(null);
  const brushPointsRef = useRef<[number, number][]>([]);
  const textClickRef = useRef<{ x: number; y: number } | null>(null);
  const [preview, setPreview] = useState<SurfaceElement | null>(null);

  // Connector tool state
  const connectorFromRef = useRef<{ x: number; y: number; id?: string } | null>(null);
  const connectorToRef   = useRef<{ x: number; y: number; id?: string } | null>(null);
  const [connectorDraft, setConnectorDraft] = useState<{
    fx: number; fy: number; tx: number; ty: number;
  } | null>(null);

  function getBoardPoint(e: React.PointerEvent) {
    const { viewport } = useViewportStore.getState();
    const rect = viewportRef.current!.getBoundingClientRect();
    return screenToBoardPoint(e.clientX, e.clientY, viewport, rect);
  }

  function snapToShape(bx: number, by: number): { x: number; y: number; id?: string } {
    const shapes = useSurfaceStore.getState().elements.filter(
      (el) => el.type === "rect" || el.type === "ellipse" || el.type === "diamond"
    );
    let best: { x: number; y: number; id?: string } = { x: bx, y: by };
    let minDist = CONNECTOR_SNAP_DIST;
    for (const el of shapes) {
      const cp = nearestConnectionPoint(bx, by, el);
      if (cp.dist < minDist) { minDist = cp.dist; best = { x: cp.x, y: cp.y, id: el.id }; }
    }
    return best;
  }

  function onPointerDown(e: React.PointerEvent) {
    // Clear stale text click ref
    textClickRef.current = null;

    const { activeTool, setActiveTool, setSelectedIds, setEditingTextId } =
      useSessionStore.getState();
    if (!viewportRef.current) return;

    // Connector tool: start drawing from nearest shape connection point
    if (activeTool === "connector") {
      const b = getBoardPoint(e);
      const from = snapToShape(b.x, b.y);
      connectorFromRef.current = from;
      connectorToRef.current   = from;
      setConnectorDraft({ fx: from.x, fy: from.y, tx: from.x, ty: from.y });
      (e.target as Element).setPointerCapture(e.pointerId);
      e.stopPropagation();
      return;
    }

    // Text tool: record click position for creation on pointer-up (avoids focus timing issues)
    if (activeTool === "text") {
      textClickRef.current = getBoardPoint(e);
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

    // Connector: update endpoint, snap to shapes
    if (activeTool === "connector" && connectorFromRef.current) {
      const b = getBoardPoint(e);
      const to = snapToShape(b.x, b.y);
      connectorToRef.current = to;
      const from = connectorFromRef.current;
      setConnectorDraft({ fx: from.x, fy: from.y, tx: to.x, ty: to.y });
      return;
    }

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
    const { activeTool, setActiveTool, setSelectedIds, setEditingTextId } = useSessionStore.getState();

    // Text: commit element
    if (textClickRef.current) {
      const b = textClickRef.current;
      textClickRef.current = null;

      useHistoryStore.getState().push({
        blocks: useBlockStore.getState().blocks,
        elements: useSurfaceStore.getState().elements,
      });

      const id = crypto.randomUUID();
      const el: SurfaceElement = {
        id, type: "text",
        x: b.x, y: b.y, w: 200, h: 40, z: Date.now(),
        fillColor: "transparent", strokeColor: "transparent",
        strokeWidth: 0, strokeStyle: "solid", opacity: 1,
        text: "", fontSize: 18, fontWeight: "normal", textAlign: "left",
      };
      useSurfaceStore.getState().addElement(el);
      setSelectedIds([id]);
      setEditingTextId(id);
      setActiveTool("select");
      return;
    }

    // Connector: commit
    if (activeTool === "connector") {
      const from = connectorFromRef.current;
      const to   = connectorToRef.current;
      connectorFromRef.current = null;
      connectorToRef.current   = null;
      setConnectorDraft(null);

      if (!from || !to) return;
      const dx = Math.abs(to.x - from.x);
      const dy = Math.abs(to.y - from.y);
      if (dx < 5 && dy < 5) return; // ignore misclick

      useHistoryStore.getState().push({
        blocks: useBlockStore.getState().blocks,
        elements: useSurfaceStore.getState().elements,
      });

      const id = crypto.randomUUID();
      const el: SurfaceElement = {
        id, type: "connector",
        x: Math.min(from.x, to.x), y: Math.min(from.y, to.y),
        w: Math.abs(to.x - from.x) || 1, h: Math.abs(to.y - from.y) || 1,
        z: Date.now(),
        fillColor: "transparent", strokeColor: "#243231",
        strokeWidth: 2, strokeStyle: "solid", opacity: 1,
        fromId: from.id, fromPoint: [from.x, from.y],
        toId: to.id,     toPoint:   [to.x,   to.y],
        curveType: "curved", arrowEnd: true,
      };
      useSurfaceStore.getState().addElement(el);
      setActiveTool("select");
      setSelectedIds([id]);
      return;
    }

    // Brush: commit stroke
    if (activeTool === "brush") {
      const pts = brushPointsRef.current;
      brushPointsRef.current = [];
      setPreview(null);

      if (pts.length < 2) return;

      useHistoryStore.getState().push({
        blocks: useBlockStore.getState().blocks,
        elements: useSurfaceStore.getState().elements,
      });

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

    useHistoryStore.getState().push({
      blocks: useBlockStore.getState().blocks,
      elements: useSurfaceStore.getState().elements,
    });

    const id = crypto.randomUUID();
    const base: SurfaceElement = { ...snap, id, z: Date.now() };
    const el: SurfaceElement = snap.type === "frame"
      ? {
          ...base,
          w: Math.max(base.w, MIN_FRAME_W),
          h: Math.max(base.h, MIN_FRAME_H),
          name: "",
          frameColor: DEFAULT_FRAME_COLOR,
          collapsed: false,
        }
      : base;
    useSurfaceStore.getState().addElement(el);
    setActiveTool("select");
    setSelectedIds([id]);
  }

  return { onPointerDown, onPointerMove, onPointerUp, preview, connectorDraft };
}
