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

/**
 * SurfaceBackground — bottom SVG layer of the Edgeless whiteboard.
 * Renders frames, shapes (rect/ellipse/diamond), and brushes below all blocks.
 * pointer-events: none globally; individual shapes are clickable via pointerEvents="all".
 */
export function SurfaceBackground({ previewElement }: Props) {
  const { elements } = useSurfaceStore();
  const { selectedIds, setSelectedIds } = useSessionStore();

  const shapes = elements.filter(
    (el) => el.type === "rect" || el.type === "ellipse" || el.type === "diamond"
  );

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
        {previewElement && (
          <ShapeEl
            key="_preview"
            el={previewElement}
            isSelected={false}
            isPreview={true}
          />
        )}
      </g>
      <g className="surface-brushes" />
    </svg>
  );
}
