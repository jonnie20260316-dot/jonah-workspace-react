import { useSurfaceStore } from "../stores/useSurfaceStore";
import { useSessionStore } from "../stores/useSessionStore";
import { useBlockStore } from "../stores/useBlockStore";
import { useViewportStore } from "../stores/useViewportStore";
import { useToast } from "../hooks/useToast";
import { saveText } from "../utils/storage";
import { pick } from "../utils/i18n";
import { AlignLeft, AlignCenter, AlignRight, AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd, Bold, Trash2, StickyNote } from "lucide-react";
import type { SurfaceElement } from "../types";

const FONT_SIZES: { label: string; value: number }[] = [
  { label: "S",  value: 12 },
  { label: "M",  value: 16 },
  { label: "L",  value: 20 },
  { label: "XL", value: 28 },
  { label: "2X", value: 40 },
  { label: "3X", value: 56 },
];

export function TextPropertiesPanel() {
  const selectedIds   = useSessionStore((s) => s.selectedIds);
  const editingTextId = useSessionStore((s) => s.editingTextId);
  const clearSelection = useSessionStore((s) => s.clearSelection);
  const elements      = useSurfaceStore((s) => s.elements);
  const updateElement = useSurfaceStore((s) => s.updateElement);
  const removeElement = useSurfaceStore((s) => s.removeElement);
  const { show: showToast } = useToast();

  const el = elements.find(
    (e): e is SurfaceElement =>
      e.type === "text" && selectedIds.includes(e.id) && editingTextId !== e.id
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

  function handleSendToSticky() {
    if (!el) return;
    const { zCounter } = useBlockStore.getState();
    const { boardSize } = useViewportStore.getState();
    const newId = `sticky-${Date.now()}`;
    const w = 440;
    const h = 330;
    const x = Math.max(20, Math.min(el.x, boardSize.w - w - 20));
    const y = Math.max(20, Math.min(el.y + (el.h ?? 40) + 16, boardSize.h - h - 20));

    useBlockStore.getState().addBlock({
      id: newId,
      type: "sticky",
      x,
      y,
      w,
      h,
      z: zCounter + 1,
      collapsed: false,
      archived: false,
      color: "",
    });

    // Pre-fill the sticky body field (now date-scoped, not global)
    saveText(`${newId}:body`, el.text ?? "");

    removeElement(el.id);
    clearSelection();
    showToast(pick("已轉為便利貼", "Sent to Sticky"), "success");
  }

  const fontSize = el.fontSize ?? 18;
  const isBold   = el.fontWeight === "bold";
  const align    = el.textAlign ?? "left";
  const vAlign   = el.verticalAlign ?? "top";
  const color    = el.color ?? "#243231";

  return (
    <div className="text-props-panel">
      {/* Font size presets */}
      <div className="props-size-row">
        {FONT_SIZES.map(({ label, value }) => (
          <button
            key={value}
            className={`props-size-btn${fontSize === value ? " active" : ""}`}
            onClick={() => update({ fontSize: value })}
            title={`${value}px`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="props-divider" />

      {/* Bold toggle */}
      <button
        className={`props-btn${isBold ? " active" : ""}`}
        onClick={() => update({ fontWeight: isBold ? "normal" : "bold" })}
        title={pick("粗體", "Bold")}
      >
        <Bold size={14} />
      </button>

      {/* Text align */}
      <button
        className={`props-btn${align === "left" ? " active" : ""}`}
        onClick={() => update({ textAlign: "left" })}
        title={pick("靠左", "Align left")}
      >
        <AlignLeft size={14} />
      </button>
      <button
        className={`props-btn${align === "center" ? " active" : ""}`}
        onClick={() => update({ textAlign: "center" })}
        title={pick("置中", "Center")}
      >
        <AlignCenter size={14} />
      </button>
      <button
        className={`props-btn${align === "right" ? " active" : ""}`}
        onClick={() => update({ textAlign: "right" })}
        title={pick("靠右", "Align right")}
      >
        <AlignRight size={14} />
      </button>

      {/* Vertical align */}
      <button
        className={`props-btn${vAlign === "top" ? " active" : ""}`}
        onClick={() => update({ verticalAlign: "top" })}
        title={pick("靠上", "Align top")}
      >
        <AlignVerticalJustifyStart size={14} />
      </button>
      <button
        className={`props-btn${vAlign === "middle" ? " active" : ""}`}
        onClick={() => update({ verticalAlign: "middle" })}
        title={pick("垂直置中", "Align middle")}
      >
        <AlignVerticalJustifyCenter size={14} />
      </button>
      <button
        className={`props-btn${vAlign === "bottom" ? " active" : ""}`}
        onClick={() => update({ verticalAlign: "bottom" })}
        title={pick("靠下", "Align bottom")}
      >
        <AlignVerticalJustifyEnd size={14} />
      </button>

      <div className="props-divider" />

      {/* Text color */}
      <label title={pick("文字顏色", "Text color")}>
        <input
          type="color"
          value={color}
          onChange={(e) => update({ color: e.target.value })}
        />
        {pick("色", "Color")}
      </label>

      <div className="props-divider" />

      {/* Send to Sticky */}
      <button
        className="props-btn sticky-send"
        onClick={handleSendToSticky}
        title={pick("轉為便利貼", "Send to Sticky")}
      >
        <StickyNote size={14} />
        <span>{pick("→便條", "→Sticky")}</span>
      </button>

      <div className="props-divider" />

      {/* Delete */}
      <button
        className="props-btn danger"
        onClick={handleDelete}
        title={pick("刪除", "Delete")}
        aria-label={pick("刪除文字", "Delete text")}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
