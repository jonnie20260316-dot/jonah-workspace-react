import { useRef, useEffect, useState, Fragment } from "react";
import { useViewportStore } from "../stores/useViewportStore";
import { useBlockStore } from "../stores/useBlockStore";
import { useSessionStore } from "../stores/useSessionStore";
import { useSurfaceStore } from "../stores/useSurfaceStore";
import { useHistoryStore } from "../stores/useHistoryStore";
import { ZOOM_SENSITIVITY } from "../constants";
import { BlockShell } from "../blocks/BlockShell";
import { BLOCK_REGISTRY } from "../blocks/BlockRegistry";
import { PinnedHUD } from "./PinnedHUD";
import { SurfaceBackground } from "./SurfaceBackground";
import { SurfaceForeground } from "./SurfaceForeground";
import { FrameSwitcher } from "./FrameSwitcher";
import { ContextMenu } from "./ContextMenu";
import { useLang } from "../hooks/useLang";
import { pick } from "../utils/i18n";
import { useDrawTool } from "../hooks/useDrawTool";
import { screenToBoardPoint } from "../utils/viewport";
import { rectsIntersect } from "../utils/geometry";

const TOOL_CURSOR: Record<string, string> = {
  select:    "default",
  pan:       "grab",
  rect:      "crosshair",
  ellipse:   "crosshair",
  diamond:   "crosshair",
  text:      "text",
  brush:     "crosshair",
  connector: "crosshair",
  frame:     "crosshair",
};

function captureSnapshot() {
  return {
    blocks: useBlockStore.getState().blocks,
    elements: useSurfaceStore.getState().elements,
  };
}

export function Canvas() {
  useLang();
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const { viewport, zoomTo } = useViewportStore();
  const { blocks } = useBlockStore();
  const activeTool = useSessionStore((s) => s.activeTool);
  const activeFrameId = useSessionStore((s) => s.activeFrameId);
  const [frameSwitcherOpen, setFrameSwitcherOpen] = useState(false);
  const panStateRef = useRef<{
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
  } | null>(null);
  const spacePressedRef = useRef(false);
  const [spaceOverride, setSpaceOverride] = useState<string | null>(null);
  const drawTool = useDrawTool(viewportRef);

  // Drag-select rect
  const dragSelectRef = useRef<{ startBX: number; startBY: number } | null>(null);
  const [dragSelectRect, setDragSelectRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Context menu
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; targetId: string | null } | null>(null);

  // Resolved cursor: space pan overrides tool cursor
  const cursor = spaceOverride ?? TOOL_CURSOR[activeTool] ?? "default";

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
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        if (isTextInputFocused()) return;
        e.preventDefault();
        const current = captureSnapshot();
        const snap = e.shiftKey
          ? useHistoryStore.getState().redo(current)
          : useHistoryStore.getState().undo(current);
        if (snap) {
          useBlockStore.getState().setBlocks(snap.blocks);
          useSurfaceStore.getState().setElements(snap.elements);
        }
        return;
      }
      if (e.code === "Escape") {
        if (isTextInputFocused()) return;
        const { activeFrameId: fid, setActiveFrameId, activeTool: tool, setActiveTool } = useSessionStore.getState();
        if (fid) {
          setActiveFrameId(null);
          useViewportStore.getState().fitToContent(useBlockStore.getState().blocks);
        } else if (tool !== "select") {
          setActiveTool("select");
        }
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        if (isTextInputFocused()) return;
        e.preventDefault();
        setFrameSwitcherOpen(true);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "a") {
        if (isTextInputFocused()) return;
        e.preventDefault();
        const ids = useBlockStore.getState().blocks
          .filter((b) => !b.archived && !b.pinned)
          .map((b) => b.id);
        useSessionStore.getState().setSelectedIds(ids);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "d") {
        if (isTextInputFocused()) return;
        e.preventDefault();
        useHistoryStore.getState().push(captureSnapshot());
        const { selectedIds } = useSessionStore.getState();
        const { blocks: allBlocks, addBlock } = useBlockStore.getState();
        const newIds: string[] = [];
        for (const id of selectedIds) {
          const block = allBlocks.find((b) => b.id === id);
          if (!block) continue;
          const newId = crypto.randomUUID();
          addBlock({ ...block, id: newId, x: block.x + 20, y: block.y + 20 });
          newIds.push(newId);
        }
        if (newIds.length) useSessionStore.getState().setSelectedIds(newIds);
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (isTextInputFocused()) return;
        const { selectedIds } = useSessionStore.getState();
        if (!selectedIds.length) return;
        e.preventDefault();
        useHistoryStore.getState().push(captureSnapshot());
        const { archiveBlock } = useBlockStore.getState();
        const { elements, removeElement } = useSurfaceStore.getState();
        for (const id of selectedIds) {
          if (elements.some((el) => el.id === id)) removeElement(id);
          else archiveBlock(id);
        }
        useSessionStore.getState().clearSelection();
        return;
      }
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
          setSpaceOverride("grab");
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spacePressedRef.current = false;
        panStateRef.current = null;
        delete document.body.dataset.panMode;
        setSpaceOverride(null);
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

  // Pointer pan (Space + drag) and draw tool delegation
  const onPointerDown = (e: React.PointerEvent) => {
    setContextMenu(null);
    if (spacePressedRef.current) {
      panStateRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        baseX: viewport.x,
        baseY: viewport.y,
      };
      setSpaceOverride("grabbing");
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }
    const { activeTool, clearSelection } = useSessionStore.getState();
    // Any drawing tool → delegate (text, brush, rect, ellipse, diamond, connector, frame)
    if (activeTool !== "select" && activeTool !== "pan") {
      drawTool.onPointerDown(e);
      return;
    }
    // Select tool: click on empty canvas (canvasRef bg or viewport bg) → clear selection + start drag-select
    const targetEl = e.target as HTMLElement;
    const isEmptyCanvas =
      targetEl === canvasRef.current || targetEl === viewportRef.current;
    if (activeTool === "select" && isEmptyCanvas) {
      clearSelection();
      if (!viewportRef.current) return;
      const { viewport: vp } = useViewportStore.getState();
      const rect = viewportRef.current.getBoundingClientRect();
      const b = screenToBoardPoint(e.clientX, e.clientY, vp, rect);
      dragSelectRef.current = { startBX: b.x, startBY: b.y };
      setDragSelectRect({ x: b.x, y: b.y, w: 0, h: 0 });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (panStateRef.current) {
      const { startX, startY, baseX, baseY } = panStateRef.current;
      const dx = (startX - e.clientX) / viewport.scale;
      const dy = (startY - e.clientY) / viewport.scale;
      useViewportStore.setState((s) => ({
        viewport: { ...s.viewport, x: baseX + dx, y: baseY + dy },
      }));
      return;
    }
    if (dragSelectRef.current && viewportRef.current) {
      const { viewport: vp } = useViewportStore.getState();
      const rect = viewportRef.current.getBoundingClientRect();
      const b = screenToBoardPoint(e.clientX, e.clientY, vp, rect);
      const { startBX, startBY } = dragSelectRef.current;
      setDragSelectRect({
        x: Math.min(startBX, b.x),
        y: Math.min(startBY, b.y),
        w: Math.abs(b.x - startBX),
        h: Math.abs(b.y - startBY),
      });
      return;
    }
    drawTool.onPointerMove(e);
  };

  const onPointerUp = () => {
    panStateRef.current = null;
    setSpaceOverride(spacePressedRef.current ? "grab" : null);
    if (dragSelectRef.current) {
      dragSelectRef.current = null;
      setDragSelectRect((sel) => {
        if (sel && (sel.w > 5 || sel.h > 5)) {
          const { blocks: allBlocks } = useBlockStore.getState();
          const { elements } = useSurfaceStore.getState();
          const ids: string[] = [];
          for (const b of allBlocks) {
            if (!b.archived && !b.pinned && rectsIntersect(b, sel)) ids.push(b.id);
          }
          for (const el of elements) {
            if (el.type !== "frame" && rectsIntersect(el, sel)) ids.push(el.id);
          }
          if (ids.length) useSessionStore.getState().setSelectedIds(ids);
        }
        return null;
      });
      return;
    }
    drawTool.onPointerUp();
  };

  return (
    <Fragment>
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
      onContextMenu={(e) => {
        e.preventDefault();
        const targetEl = e.target as HTMLElement;
        const blockEl = targetEl.closest("[data-id]");
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          targetId: blockEl?.getAttribute("data-id") ?? null,
        });
      }}
    >
      <div
        ref={canvasRef}
        className={activeFrameId ? "frame-focus-mode" : undefined}
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
        <SurfaceBackground viewportRef={viewportRef} previewElement={drawTool.preview} />

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
        <SurfaceForeground viewportRef={viewportRef} connectorDraft={drawTool.connectorDraft} dragSelectRect={dragSelectRect} />
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
    <FrameSwitcher open={frameSwitcherOpen} onClose={() => setFrameSwitcherOpen(false)} />
    {contextMenu && (
      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        targetId={contextMenu.targetId}
        onClose={() => setContextMenu(null)}
      />
    )}
    </Fragment>
  );
}
