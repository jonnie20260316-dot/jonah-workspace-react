import { useRef, useEffect } from "react";
import type { MouseEvent } from "react";
import { useSurfaceStore } from "../stores/useSurfaceStore";
import { useSessionStore } from "../stores/useSessionStore";
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

/**
 * SurfaceBackground — bottom SVG layer of the Edgeless whiteboard.
 * Renders frames, shapes (rect/ellipse/diamond), brushes, and text below all blocks.
 * pointer-events: none globally; individual elements are clickable via pointerEvents="all".
 */
export function SurfaceBackground({ previewElement }: Props) {
  const { elements, updateElement, removeElement } = useSurfaceStore();
  const { selectedIds, setSelectedIds, editingTextId, setEditingTextId } = useSessionStore();

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
      <g className="surface-frames" />

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
