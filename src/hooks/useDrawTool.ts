import { useRef, useState } from "react";
import type { RefObject } from "react";
import { useSessionStore } from "../stores/useSessionStore";
import { useViewportStore } from "../stores/useViewportStore";
import { useSurfaceStore } from "../stores/useSurfaceStore";
import { screenToBoardPoint } from "../utils/viewport";
import type { SurfaceElement } from "../types";

const DRAW_TOOLS = new Set(["rect", "ellipse", "diamond"]);

function makePreview(type: string, x: number, y: number, w: number, h: number): SurfaceElement {
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
  const [preview, setPreview] = useState<SurfaceElement | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    const { activeTool } = useSessionStore.getState();
    if (!DRAW_TOOLS.has(activeTool) || !viewportRef.current) return;

    const { viewport } = useViewportStore.getState();
    const rect = viewportRef.current.getBoundingClientRect();
    const b = screenToBoardPoint(e.clientX, e.clientY, viewport, rect);

    drawRef.current = { startX: b.x, startY: b.y };
    (e.target as Element).setPointerCapture(e.pointerId);
    e.stopPropagation();
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drawRef.current || !viewportRef.current) return;
    const { activeTool } = useSessionStore.getState();
    if (!DRAW_TOOLS.has(activeTool)) return;

    const { viewport } = useViewportStore.getState();
    const rect = viewportRef.current.getBoundingClientRect();
    const b = screenToBoardPoint(e.clientX, e.clientY, viewport, rect);

    const x = Math.min(drawRef.current.startX, b.x);
    const y = Math.min(drawRef.current.startY, b.y);
    const w = Math.abs(b.x - drawRef.current.startX);
    const h = Math.abs(b.y - drawRef.current.startY);

    setPreview(makePreview(activeTool, x, y, Math.max(w, 1), Math.max(h, 1)));
  }

  function onPointerUp() {
    if (!drawRef.current) return;
    const { activeTool, setActiveTool, setSelectedIds } = useSessionStore.getState();
    if (!DRAW_TOOLS.has(activeTool)) { drawRef.current = null; return; }

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
