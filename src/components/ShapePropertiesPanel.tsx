import { useSurfaceStore } from "../stores/useSurfaceStore";
import { useSessionStore } from "../stores/useSessionStore";
import type { SurfaceElement } from "../types";
import { Trash2 } from "lucide-react";
import { pick } from "../utils/i18n";

const SHAPE_TYPES: SurfaceElement["type"][] = ["rect", "ellipse", "diamond"];

export function ShapePropertiesPanel() {
  const selectedIds = useSessionStore((s) => s.selectedIds);
  const clearSelection = useSessionStore((s) => s.clearSelection);
  const elements = useSurfaceStore((s) => s.elements);
  const updateElement = useSurfaceStore((s) => s.updateElement);
  const removeElement = useSurfaceStore((s) => s.removeElement);

  const el = elements.find(
    (e) => SHAPE_TYPES.includes(e.type) && selectedIds.includes(e.id)
  );

  if (!el) return null;

  function update(delta: Partial<SurfaceElement>) {
    if (!el) return;
    updateElement(el.id, delta);
  }

  function handleDelete() {
    if (!el) return;
    removeElement(el.id);
    clearSelection();
  }

  const strokeWidths: number[] = [1, 2, 4];

  const strokeStyles: { value: SurfaceElement["strokeStyle"]; label: string }[] = [
    { value: "solid",  label: "—" },
    { value: "dashed", label: "- -" },
    { value: "dotted", label: "···" },
  ];

  const opacityPct = Math.round(el.opacity * 100);

  return (
    <div className="shape-props-panel">
      {/* Fill color */}
      <label>
        <input
          type="color"
          value={el.fillColor}
          onChange={(e) => update({ fillColor: e.target.value })}
        />
        {pick("填色", "Fill")}
      </label>

      {/* Stroke color */}
      <label>
        <input
          type="color"
          value={el.strokeColor}
          onChange={(e) => update({ strokeColor: e.target.value })}
        />
        {pick("框線", "Stroke")}
      </label>

      <div className="props-divider" />

      {/* Stroke width buttons */}
      {strokeWidths.map((w) => (
        <button
          key={w}
          className={`props-btn${el.strokeWidth === w ? " active" : ""}`}
          onClick={() => update({ strokeWidth: w })}
          title={`${pick("線寬", "Width")} ${w}`}
        >
          {w}
        </button>
      ))}

      <div className="props-divider" />

      {/* Stroke style buttons */}
      {strokeStyles.map((s) => (
        <button
          key={s.value}
          className={`props-btn${el.strokeStyle === s.value ? " active" : ""}`}
          onClick={() => update({ strokeStyle: s.value })}
          title={pick(
            s.value === "solid" ? "實線" : s.value === "dashed" ? "虛線" : "點線",
            s.value
          )}
        >
          {s.label}
        </button>
      ))}

      <div className="props-divider" />

      {/* Opacity */}
      <label>
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={el.opacity}
          onChange={(e) => update({ opacity: parseFloat(e.target.value) })}
        />
        {opacityPct}%
      </label>

      <div className="props-divider" />

      {/* Delete */}
      <button
        className="props-btn danger"
        onClick={handleDelete}
        title={pick("刪除", "Delete")}
        aria-label={pick("刪除元素", "Delete element")}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
