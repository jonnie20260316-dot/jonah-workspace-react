import { Plus } from "lucide-react";
import { useState } from "react";
import { useBlockStore } from "../stores/useBlockStore";
import { useViewportStore } from "../stores/useViewportStore";
import { useSurfaceStore } from "../stores/useSurfaceStore";
import { useHistoryStore } from "../stores/useHistoryStore";
import { BLOCK_REGISTRY, getAddableBlockTypes } from "../blocks/BlockRegistry";
import { BLOCK_ICONS } from "../utils/blockIcons";
import { pick } from "../utils/i18n";
import { useLang } from "../hooks/useLang";
import { useToast } from "../hooks/useToast";
import type { BlockType } from "../types";

export function FAB() {
  useLang();
  const { blocks, addBlock, zCounter } = useBlockStore();
  const { viewport, boardSize } = useViewportStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pressed, setPressed] = useState(false);

  const addableTypes = getAddableBlockTypes(blocks.map((b) => b.id));

  const handleAddBlock = (type: BlockType) => {
    const config = BLOCK_REGISTRY[type];
    if (!config) return;

    useHistoryStore.getState().push({
      blocks: useBlockStore.getState().blocks,
      elements: useSurfaceStore.getState().elements,
    });

    const vp = viewport;
    const vpCenterX = vp.x + (window.innerWidth / 2) / vp.scale;
    const vpCenterY = vp.y + (window.innerHeight / 2) / vp.scale;

    const spawnX = vpCenterX - config.size.w / 2;
    const spawnY = vpCenterY - config.size.h / 2;

    const x = Math.max(20, Math.min(spawnX, boardSize.w - config.size.w - 20));
    const y = Math.max(20, Math.min(spawnY, boardSize.h - config.size.h - 20));

    addBlock({
      // eslint-disable-next-line react-hooks/purity
      id: `${type}-${Date.now()}`,
      type,
      x,
      y,
      w: config.size.w,
      h: config.size.h,
      z: zCounter + 1,
      collapsed: false,
      archived: false,
      color: "",
    });
    setMenuOpen(false);
  };

  const isEmpty = blocks.filter((b) => !b.archived).length === 0;

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onMouseLeave={() => setPressed(false)}
        title={pick("新增區塊", "Add block")}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 50,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "var(--ink)",
          color: "var(--text-inverted)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "var(--shadow-float)",
          transform: pressed ? "scale(0.94)" : menuOpen ? "scale(1.0)" : "scale(1.0)",
          transition: `transform var(--dur-instant) var(--ease-standard), box-shadow var(--dur-fast) var(--ease-standard)`,
        }}
        onMouseEnter={(e) => {
          if (!pressed) (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.06)";
        }}
        onFocus={() => {}}
      >
        <Plus size={22} strokeWidth={2} style={{ transform: menuOpen ? "rotate(45deg)" : "rotate(0deg)", transition: "transform 200ms var(--ease-spring)" }} />
        {/* Empty canvas pulse ring */}
        {isEmpty && !menuOpen && (
          <span style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "2px solid var(--accent)",
            animation: "emptyPulse 2.4s var(--ease-standard) infinite",
            pointerEvents: "none",
          }} />
        )}
      </button>

      {/* Block Type Picker */}
      {menuOpen && (
        <div
          style={{
            position: "fixed",
            bottom: 92,
            right: 24,
            zIndex: 50,
            background: "var(--surface-1)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-float)",
            padding: "6px 0",
            width: 240,
            maxHeight: 480,
            overflowY: "auto",
            animation: "fabPickerIn 280ms var(--ease-spring) forwards",
          }}
        >
          {Object.entries(BLOCK_REGISTRY).map(([typeStr, config]) => {
            const type = typeStr as BlockType;
            const isAddable = addableTypes.includes(type);
            const isUnique = config.unique ?? false;
            const Icon = BLOCK_ICONS[type];

            return (
              <button
                key={type}
                onClick={() => {
                  if (!isAddable && isUnique) {
                    useToast.getState().show(
                      pick("這個區塊最多只能新增一次", "This block can only be added once"),
                      "info"
                    );
                    return;
                  }
                  handleAddBlock(type);
                }}
                disabled={!isAddable && isUnique}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  height: 44,
                  padding: "0 16px",
                  border: "none",
                  background: "none",
                  cursor: isAddable || !isUnique ? "pointer" : "not-allowed",
                  textAlign: "left",
                  color: "var(--ink)",
                  transition: "background var(--dur-instant)",
                  opacity: isAddable ? 1 : 0.5,
                }}
                onMouseEnter={(e) => {
                  if (isAddable || !isUnique) {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(36,50,49,0.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "none";
                }}
              >
                <span style={{ color: "var(--text-tertiary)", display: "flex", flexShrink: 0 }}>
                  <Icon size={16} strokeWidth={1.8} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ display: "block", fontSize: 13, fontWeight: 500 }}>
                      {pick(config.zhTitle, config.title)}
                    </span>
                    {isUnique && (
                      <span style={{ fontSize: 10, color: "var(--text-tertiary)", opacity: 0.7 }}>
                        {pick("(限一個)", "(Once only)")}
                      </span>
                    )}
                  </div>
                  <span style={{ display: "block", fontSize: 11, color: "var(--text-tertiary)", marginTop: 1 }}>
                    {pick(config.zhSubtitle, config.subtitle)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Backdrop */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 40 }}
        />
      )}
    </>
  );
}
