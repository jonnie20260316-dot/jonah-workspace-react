import { useState, useRef, useEffect, memo } from "react";
import type { ReactNode } from "react";
import { ChevronUp, ChevronDown, ArchiveX, Palette, GripVertical, Pin, PinOff } from "lucide-react";
import { useBlockStore } from "../stores/useBlockStore";
import { useBlockDrag } from "../hooks/useBlockDrag";
import { useBlockResize } from "../hooks/useBlockResize";
import { BLOCK_ICONS } from "../utils/blockIcons";
import { BLOCK_REGISTRY } from "./BlockRegistry";
import { pick } from "../utils/i18n";
import { useLang } from "../hooks/useLang";
import type { Block } from "../types";

// Named color themes — stored as strings, mapped to CSS classes
const COLOR_THEMES: { id: string; zhLabel: string; enLabel: string; hex: string }[] = [
  { id: "sage",  zhLabel: "黛", enLabel: "Sage",  hex: "#1f786f" },
  { id: "amber", zhLabel: "琥", enLabel: "Amber", hex: "#bc7542" },
  { id: "clay",  zhLabel: "赤", enLabel: "Clay",  hex: "#b45a3c" },
  { id: "plum",  zhLabel: "暮", enLabel: "Plum",  hex: "#82508c" },
  { id: "slate", zhLabel: "霜", enLabel: "Slate", hex: "#5a6e7a" },
  { id: "moss",  zhLabel: "苔", enLabel: "Moss",  hex: "#5a8246" },
];

// Migrate legacy hex color values to named themes
function migrateColor(color: string): string {
  if (!color) return "";
  if (COLOR_THEMES.some((t) => t.id === color)) return color;
  // Legacy hex mapping
  const legacyMap: Record<string, string> = {
    "#ff6b6b": "clay",
    "#ffa94d": "amber",
    "#ffd93d": "amber",
    "#6bcf7f": "moss",
    "#4d96ff": "slate",
    "#b19cd9": "plum",
    "#ff85a2": "plum",
  };
  return legacyMap[color] ?? "";
}

interface BlockShellProps {
  block: Block;
  children: ReactNode;
}

function BlockShellInner({ block, children }: BlockShellProps) {
  const { updateBlock, archiveBlock, bringToFront } = useBlockStore();
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  // Block bloom: animate on first mount, then clear class
  const [justCreated, setJustCreated] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setJustCreated(false), 400);
    return () => clearTimeout(t);
  }, []);

  const headerRef = useRef<HTMLDivElement>(null);
  const nwHandleRef = useRef<HTMLDivElement>(null);
  const neHandleRef = useRef<HTMLDivElement>(null);
  const swHandleRef = useRef<HTMLDivElement>(null);
  const seHandleRef = useRef<HTMLDivElement>(null);

  useBlockDrag(block.id, headerRef);
  useBlockResize(block.id, "nw", nwHandleRef);
  useBlockResize(block.id, "ne", neHandleRef);
  useBlockResize(block.id, "sw", swHandleRef);
  useBlockResize(block.id, "se", seHandleRef);

  const handleCollapse = () => updateBlock(block.id, { collapsed: !block.collapsed });
  const handleArchive = () => archiveBlock(block.id);
  const handlePin = () => {
    if (block.pinned) {
      updateBlock(block.id, { pinned: false });
    } else {
      // Assign next pinnedOrder
      const pinnedBlocks = useBlockStore.getState().blocks.filter((b) => b.pinned);
      const maxOrder = pinnedBlocks.reduce((max, b) => Math.max(max, b.pinnedOrder ?? 0), 0);
      updateBlock(block.id, { pinned: true, collapsed: true, pinnedOrder: maxOrder + 1 });
    }
  };

  const handleColor = (themeId: string) => {
    updateBlock(block.id, { color: themeId });
    setColorPickerOpen(false);
  };
  const handleClearColor = () => {
    updateBlock(block.id, { color: "" });
    setColorPickerOpen(false);
  };

  const lang = useLang();
  const TypeIcon = BLOCK_ICONS[block.type];
  const effectiveColor = migrateColor(block.color);
  const colorClass = effectiveColor ? `block-color-${effectiveColor}` : "";

  const cfg = BLOCK_REGISTRY[block.type];
  const blockTitle = pick(cfg.zhTitle, cfg.title);

  return (
    <article
      className={`board-block type-${block.type} ${block.collapsed ? "is-collapsed" : ""} ${colorClass} ${justCreated ? "block-bloom" : ""}`}
      data-id={block.id}
      data-type={block.type}
      style={{
        position: "absolute",
        left: `${block.x}px`,
        top: `${block.y}px`,
        width: `${block.w}px`,
        height: `${block.h}px`,
        zIndex: block.z,
        minWidth: "260px",
        minHeight: "200px",
        ...(block.textScale != null ? { "--text-scale": String(block.textScale) } as React.CSSProperties : {}),
      }}
      onMouseDown={() => bringToFront(block.id)}
    >
      {/* Block Header */}
      <div ref={headerRef} className="block-head">
        {/* Drag handle */}
        <div className="block-drag-handle">
          <GripVertical size={14} />
        </div>

        {/* Type icon */}
        <div className="block-type-icon">
          <TypeIcon size={14} />
        </div>

        {/* Title */}
        <div className="block-title">
          <h2>{blockTitle}</h2>
        </div>

        {/* Actions */}
        <div className="block-actions">
          {/* Pin / Unpin */}
          <button
            onClick={handlePin}
            title={pick(block.pinned ? "取消固定" : "固定", block.pinned ? "Unpin" : "Pin")}
          >
            {block.pinned ? <PinOff size={14} /> : <Pin size={14} />}
          </button>

          {/* Collapse / Expand */}
          <button
            onClick={handleCollapse}
            title={pick(block.collapsed ? "展開" : "收合", block.collapsed ? "Expand" : "Collapse")}
          >
            {block.collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>

          {/* Archive */}
          <button onClick={handleArchive} title={pick("封存", "Archive")}>
            <ArchiveX size={14} />
          </button>

          {/* Color Picker */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setColorPickerOpen(!colorPickerOpen)}
              title={pick("主題色", "Theme color")}
              style={effectiveColor ? { color: `var(--block-accent, var(--accent))` } : undefined}
            >
              <Palette size={14} />
            </button>
            {colorPickerOpen && (
              <div className="color-flyout">
                {/* Clear option */}
                <button
                  className="color-swatch"
                  onClick={handleClearColor}
                  title={pick("無", "None")}
                >
                  <div
                    className="color-swatch-dot"
                    style={{ background: "transparent", border: "1.5px dashed var(--text-tertiary)" }}
                  />
                  <span className="color-swatch-label">無</span>
                </button>
                {/* Theme swatches */}
                {COLOR_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    className="color-swatch"
                    onClick={() => handleColor(theme.id)}
                    title={theme.enLabel}
                  >
                    <div
                      className="color-swatch-dot"
                      style={{
                        background: theme.hex,
                        outline: effectiveColor === theme.id ? `2px solid ${theme.hex}` : "none",
                        outlineOffset: "2px",
                      }}
                    />
                    <span className="color-swatch-label">{theme.zhLabel}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Block Body */}
      {!block.collapsed && (
        <div className="block-body">{children}</div>
      )}

      {/* Resize Handles */}
      <div ref={nwHandleRef} className="resize-handle nw" />
      <div ref={neHandleRef} className="resize-handle ne" />
      <div ref={swHandleRef} className="resize-handle sw" />
      <div ref={seHandleRef} className="resize-handle se" />
    </article>
  );
}

export const BlockShell = memo(BlockShellInner);
