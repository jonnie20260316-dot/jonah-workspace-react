import { useRef, useEffect, useState } from "react";
import { useViewportStore } from "../stores/useViewportStore";
import { useBlockStore } from "../stores/useBlockStore";
import { ZOOM_SENSITIVITY } from "../constants";
import { BlockShell } from "../blocks/BlockShell";
import { BLOCK_REGISTRY } from "../blocks/BlockRegistry";
import { PinnedHUD } from "./PinnedHUD";
import { SurfaceBackground } from "./SurfaceBackground";
import { SurfaceForeground } from "./SurfaceForeground";
import { useLang } from "../hooks/useLang";
import { pick } from "../utils/i18n";

export function Canvas() {
  useLang();
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const { viewport, zoomTo } = useViewportStore();
  const { blocks } = useBlockStore();
  const panStateRef = useRef<{
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
  } | null>(null);
  const spacePressedRef = useRef(false);
  const [cursor, setCursor] = useState("default");

  // Apply viewport transform imperatively
  useEffect(() => {
    if (!canvasRef.current) return;
    canvasRef.current.style.transform =
      `scale(${viewport.scale}) translate(${-viewport.x}px, ${-viewport.y}px)`;
  }, [viewport]);

  // Keyboard: Space = pan mode
  useEffect(() => {
    // Check if focus is inside a text input, textarea, or contenteditable
    const isTextInputFocused = (): boolean => {
      const el = document.activeElement;
      if (!el) return false;

      // Check if element itself is input or textarea
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        return true;
      }

      // Check if element is contenteditable
      if (el instanceof HTMLElement && el.contentEditable === "true") {
        return true;
      }

      // Check if focus is inside an input/textarea (e.g., shadow DOM or nested structure)
      if (el instanceof HTMLElement && (el.closest("input") || el.closest("textarea"))) {
        return true;
      }

      return false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        // If focus is in a text input, let space propagate normally
        if (isTextInputFocused()) {
          return;
        }

        e.preventDefault(); // suppress scroll + typing on ALL Space keydowns (including repeats)
        if (!e.repeat) {
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur(); // drop focus so no input receives the key
          }
          spacePressedRef.current = true;
          document.body.dataset.panMode = "1";
          setCursor("grab");
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spacePressedRef.current = false;
        panStateRef.current = null;
        delete document.body.dataset.panMode;
        setCursor("default");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // Wheel zoom (passive: false to prevent scroll)
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = Math.pow(2, -e.deltaY * ZOOM_SENSITIVITY);
      const rect = el.getBoundingClientRect();
      zoomTo(viewport.scale * factor, e.clientX, e.clientY, rect);
    };

    el.addEventListener("wheel", onWheel, { passive: false });

    return () => el.removeEventListener("wheel", onWheel);
  }, [viewport.scale, zoomTo]);

  // Pointer pan (Space + drag)
  const onPointerDown = (e: React.PointerEvent) => {
    if (!spacePressedRef.current) return;
    panStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: viewport.x,
      baseY: viewport.y,
    };
    setCursor("grabbing");
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!panStateRef.current) return;
    const { startX, startY, baseX, baseY } = panStateRef.current;
    const dx = (startX - e.clientX) / viewport.scale;
    const dy = (startY - e.clientY) / viewport.scale;
    useViewportStore.setState((s) => ({
      viewport: { ...s.viewport, x: baseX + dx, y: baseY + dy },
    }));
  };

  const onPointerUp = () => {
    panStateRef.current = null;
    setCursor(spacePressedRef.current ? "grab" : "default");
  };

  return (
    <div
      ref={viewportRef}
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        cursor,
        background: `
          radial-gradient(circle at top left, rgba(188,117,66,0.12), transparent 26%),
          radial-gradient(circle at top right, rgba(31,120,111,0.12), transparent 22%),
          linear-gradient(180deg, #fbf7f0 0%, var(--canvas-bg) 38%, var(--canvas-bg-deep) 100%)
        `,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        ref={canvasRef}
        style={{
          position: "absolute",
          width: 20000,
          height: 15000,
          transformOrigin: "0 0",
          backgroundColor: "var(--canvas-bg)",
          backgroundImage: "radial-gradient(circle, rgba(36,50,49,0.18) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        {/* Surface background: frames, shapes, brushes — below blocks */}
        <SurfaceBackground />

        {/* Render all non-archived, non-pinned blocks */}
        {blocks
          .filter((b) => !b.archived && !b.pinned)
          .map((block) => {
            const BlockComponent = BLOCK_REGISTRY[block.type]?.component;
            if (!BlockComponent) return null;

            return (
              <BlockShell key={block.id} block={block}>
                <BlockComponent block={block} />
              </BlockShell>
            );
          })}

        {/* Surface foreground: connectors, selection handles — above blocks */}
        <SurfaceForeground />
      </div>

      {/* Pinned blocks HUD — viewport-fixed, outside canvas transform */}
      <PinnedHUD />

      {/* Empty state — viewport-fixed, not on the canvas */}
      {blocks.filter((b) => !b.archived).length === 0 && (
        <div className="canvas-empty-state">
          <div className="canvas-empty-pulse" />
          <p className="canvas-empty-text">
            {pick("在這裡，構建你的一天", "Build your day, right here.")}
          </p>
        </div>
      )}
    </div>
  );
}
