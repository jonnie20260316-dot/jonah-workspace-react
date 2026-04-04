import { useRef, useEffect } from "react";
import type { MouseEvent } from "react";
import { useSurfaceStore } from "../stores/useSurfaceStore";
import { useSessionStore } from "../stores/useSessionStore";
import { useViewportStore } from "../stores/useViewportStore";
import { useBlockStore } from "../stores/useBlockStore";
import { ZONE_PALETTES } from "../constants";
import type { SurfaceElement } from "../types";

interface Props {
  previewElement?: SurfaceElement | null;
}

function diamondPoints(x: number, y: number, w: number, h: number): string {
  const cx = x + w / 2;
  const cy = y + h / 2;
  return `${cx},${y} ${x + w},${cy} ${cx},${y + h} ${x},${cy}`;
}

function ShapeEl({ el, isSelected, isPreview, onSelect }: {
  el: SurfaceElement;
  isSelected: boolean;
  isPreview: boolean;
  onSelect?: (e: MouseEvent<SVGElement>) => void;
}) {
  const dashArray =
    el.strokeStyle === "dashed" ? "8 4" :
    el.strokeStyle === "dotted" ? "2 3" :
    undefined;

  const RING = 5;
  const pe = isPreview ? "none" : "all";
  const cursor = isPreview ? undefined : "pointer";

  return (
    <g>
      {isSelected && !isPreview && (
        <rect
          x={el.x - RING}
          y={el.y - RING}
          width={el.w + RING * 2}
          height={el.h + RING * 2}
          fill="none"
          stroke="var(--accent, #4f9cf9)"
          strokeWidth={1.5}
          rx={2}
          pointerEvents="none"
        />
      )}
      {el.type === "rect" && (
        <rect
          x={el.x} y={el.y}
          width={el.w} height={el.h}
          rx={el.cornerRadius ?? 0}
          fill={el.fillColor}
          stroke={el.strokeColor}
          strokeWidth={el.strokeWidth}
          strokeDasharray={dashArray}
          opacity={el.opacity}
          pointerEvents={pe}
          style={{ cursor }}
          onClick={onSelect}
        />
      )}
      {el.type === "ellipse" && (
        <ellipse
          cx={el.x + el.w / 2}
          cy={el.y + el.h / 2}
          rx={el.w / 2}
          ry={el.h / 2}
          fill={el.fillColor}
          stroke={el.strokeColor}
          strokeWidth={el.strokeWidth}
          strokeDasharray={dashArray}
          opacity={el.opacity}
          pointerEvents={pe}
          style={{ cursor }}
          onClick={onSelect}
        />
      )}
      {el.type === "diamond" && (
        <polygon
          points={diamondPoints(el.x, el.y, el.w, el.h)}
          fill={el.fillColor}
          stroke={el.strokeColor}
          strokeWidth={el.strokeWidth}
          strokeDasharray={dashArray}
          opacity={el.opacity}
          pointerEvents={pe}
          style={{ cursor }}
          onClick={onSelect}
        />
      )}
    </g>
  );
}

/** Auto-focuses when mounted; saves on blur or Escape */
function TextEditor({ el, onSave }: {
  el: SurfaceElement;
  onSave: (text: string) => void;
}) {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = divRef.current;
    if (!node) return;
    node.focus();
    // Place cursor at end
    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(false);
    const sel = window.getSelection();
    if (sel) { sel.removeAllRanges(); sel.addRange(range); }
  }, []);

  function commit(node: HTMLDivElement) {
    onSave(node.textContent ?? "");
  }

  return (
    <div
      ref={divRef}
      className="surface-text-div"
      contentEditable
      suppressContentEditableWarning
      style={{
        fontSize: `${el.fontSize ?? 18}px`,
        fontWeight: el.fontWeight ?? "normal",
        textAlign: el.textAlign ?? "left",
      }}
      onBlur={(e) => commit(e.currentTarget)}
      onKeyDown={(e) => {
        e.stopPropagation(); // block canvas shortcuts while typing
        if (e.key === "Escape") {
          e.preventDefault();
          commit(e.currentTarget as HTMLDivElement);
        }
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {el.text}
    </div>
  );
}

function TextEl({ el, isSelected, isEditing, onSelect, onEdit, onSave }: {
  el: SurfaceElement;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onSave: (text: string) => void;
}) {
  const w = Math.max(el.w, 120);
  const h = Math.max(el.h, 32);

  return (
    <foreignObject
      x={el.x}
      y={el.y}
      width={w}
      height={h}
      style={{ overflow: "visible" }}
      pointerEvents="all"
    >
      {isEditing ? (
        <TextEditor el={el} onSave={onSave} />
      ) : (
        <div
          className="surface-text-div"
          style={{
            fontSize: `${el.fontSize ?? 18}px`,
            fontWeight: el.fontWeight ?? "normal",
            textAlign: el.textAlign ?? "left",
            outline: isSelected ? "2px solid var(--accent, #4f9cf9)" : "none",
            outlineOffset: "2px",
          }}
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          onDoubleClick={(e) => { e.stopPropagation(); onEdit(); }}
        >
          {el.text || <span style={{ opacity: 0.35, fontStyle: "italic" }}>文字…</span>}
        </div>
      )}
    </foreignObject>
  );
}

/** Renders a single Frame (Zone) with its colored background and header bar */
function FrameEl({ el, isSelected, onSelect, onUpdate, onDelete, onEnter, blockCount }: {
  el: SurfaceElement;
  isSelected: boolean;
  blockCount: number;
  onSelect: () => void;
  onUpdate: (delta: Partial<SurfaceElement>) => void;
  onDelete: () => void;
  onEnter?: () => void;
}) {
  const palette = ZONE_PALETTES.find((p) => p.id === el.frameColor) ?? ZONE_PALETTES[0];
  const collapsed = el.collapsed ?? false;
  const displayH = collapsed ? 32 : el.h;

  return (
    <g>
      {/* Background rect */}
      <rect
        x={el.x}
        y={el.y}
        width={el.w}
        height={displayH}
        fill={palette.bg}
        stroke={isSelected ? "var(--accent, #4f9cf9)" : palette.border}
        strokeWidth={isSelected ? 2 : 1.5}
        strokeDasharray={collapsed ? undefined : "8 4"}
        rx={8}
        pointerEvents="all"
        style={{ cursor: "pointer" }}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
      />

      {/* Watermark name label — only when not collapsed */}
      {!collapsed && el.name && (
        <text
          x={el.x + el.w / 2}
          y={el.y + displayH - 16}
          textAnchor="middle"
          fontSize={Math.min(el.w / 6, 48)}
          fontWeight="700"
          fill={palette.border}
          opacity={0.07}
          pointerEvents="none"
          style={{ userSelect: "none" }}
        >
          {el.name}
        </text>
      )}

      {/* Header bar (foreignObject) */}
      <foreignObject
        x={el.x}
        y={el.y}
        width={el.w}
        height={32}
        className="frame-header-fo"
        style={{ overflow: "visible" }}
      >
        <div
          className="frame-header"
          onPointerDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => { e.stopPropagation(); onEnter?.(); }}
        >
          {/* Name input */}
          <input
            className="frame-name-input"
            value={el.name ?? ""}
            placeholder="分區名稱…"
            onChange={(e) => onUpdate({ name: e.target.value })}
            onPointerDown={(e) => e.stopPropagation()}
          />

          {/* Block count badge */}
          {collapsed && (
            <span className="frame-block-count">{blockCount}</span>
          )}

          {/* Color palette */}
          <div className="frame-palette">
            {ZONE_PALETTES.map((p) => (
              <div
                key={p.id}
                className={`frame-palette-dot${el.frameColor === p.id ? " active" : ""}`}
                style={{ background: p.border }}
                title={p.label}
                onClick={(e) => { e.stopPropagation(); onUpdate({ frameColor: p.id }); }}
              />
            ))}
          </div>

          {/* Collapse toggle */}
          <button
            className="frame-action-btn"
            title={collapsed ? "展開" : "收合"}
            onClick={(e) => { e.stopPropagation(); onUpdate({ collapsed: !collapsed }); }}
          >
            {collapsed ? "▼" : "▲"}
          </button>

          {/* Delete */}
          <button
            className="frame-action-btn"
            title="刪除分區"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            ×
          </button>
        </div>
      </foreignObject>
    </g>
  );
}

/**
 * SurfaceBackground — bottom SVG layer of the Edgeless whiteboard.
 * Renders frames, shapes (rect/ellipse/diamond), brushes, and text below all blocks.
 * pointer-events: none globally; individual elements are clickable via pointerEvents="all".
 */
export function SurfaceBackground({ previewElement }: Props) {
  const { elements, updateElement, removeElement } = useSurfaceStore();
  const { selectedIds, setSelectedIds, editingTextId, setEditingTextId, setActiveFrameId } = useSessionStore();
  const animateToFrame = useViewportStore((s) => s.animateToFrame);
  const blocks = useBlockStore((s) => s.blocks);

  const frames = elements.filter((el) => el.type === "frame");
  const shapes = elements.filter(
    (el) => el.type === "rect" || el.type === "ellipse" || el.type === "diamond"
  );
  const brushes = elements.filter((el) => el.type === "brush");
  const texts = elements.filter((el) => el.type === "text");

  return (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        overflow: "visible",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      <g className="surface-frames">
        {frames.map((el) => {
          const count = blocks.filter((b) => !b.archived && b.zoneId === el.id).length;
          return (
            <FrameEl
              key={el.id}
              el={el}
              isSelected={selectedIds.includes(el.id)}
              blockCount={count}
              onSelect={() => setSelectedIds([el.id])}
              onUpdate={(delta) => updateElement(el.id, delta)}
              onEnter={() => {
                animateToFrame(el);
                setActiveFrameId(el.id);
              }}
              onDelete={() => {
                removeElement(el.id);
                // clear zoneId from blocks that belonged to this frame
                useBlockStore.getState().blocks
                  .filter((b) => b.zoneId === el.id)
                  .forEach((b) => useBlockStore.getState().updateBlock(b.id, { zoneId: undefined }));
              }}
            />
          );
        })}
      </g>

      <g className="surface-shapes">
        {shapes.map((el) => (
          <ShapeEl
            key={el.id}
            el={el}
            isSelected={selectedIds.includes(el.id)}
            isPreview={false}
            onSelect={(e) => { e.stopPropagation(); setSelectedIds([el.id]); }}
          />
        ))}
        {previewElement &&
          (previewElement.type === "rect" ||
            previewElement.type === "ellipse" ||
            previewElement.type === "diamond") && (
          <ShapeEl
            key="_preview"
            el={previewElement}
            isSelected={false}
            isPreview={true}
          />
        )}
      </g>

      <g className="surface-brushes">
        {brushes.map((el) => (
          <path
            key={el.id}
            d={el.pathData ?? ""}
            fill="none"
            stroke={el.strokeColor}
            strokeWidth={el.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={el.opacity}
            pointerEvents="visibleStroke"
            style={{ cursor: "pointer" }}
            onClick={(e) => { e.stopPropagation(); setSelectedIds([el.id]); }}
          />
        ))}
        {previewElement?.type === "brush" && (
          <path
            key="_preview-brush"
            d={previewElement.pathData ?? ""}
            fill="none"
            stroke={previewElement.strokeColor}
            strokeWidth={previewElement.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={previewElement.opacity}
            pointerEvents="none"
          />
        )}
      </g>

      <g className="surface-texts">
        {texts.map((el) => (
          <TextEl
            key={el.id}
            el={el}
            isSelected={selectedIds.includes(el.id)}
            isEditing={editingTextId === el.id}
            onSelect={() => setSelectedIds([el.id])}
            onEdit={() => setEditingTextId(el.id)}
            onSave={(text) => {
              if (!text.trim()) {
                removeElement(el.id);
              } else {
                updateElement(el.id, { text });
              }
              setEditingTextId(null);
            }}
          />
        ))}
      </g>
    </svg>
  );
}
