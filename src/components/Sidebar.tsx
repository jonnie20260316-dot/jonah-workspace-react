import { useState, useRef } from "react";
import { X, LayoutGrid, Rows3 } from "lucide-react";
import { useUIStore } from "../stores/useUIStore";
import { useBlockStore } from "../stores/useBlockStore";
import { useSessionStore } from "../stores/useSessionStore";
import { useViewportStore } from "../stores/useViewportStore";
import { BLOCK_ICONS } from "../utils/blockIcons";
import { pick } from "../utils/i18n";
import { useLang } from "../hooks/useLang";
import { loadJSON, saveJSON } from "../utils/storage";
import { BLOCK_REGISTRY } from "../blocks/BlockRegistry";
import type { BlockType } from "../types";

const DEFAULT_CATEGORY_ORDER: BlockType[] = [
  "journal", "kit", "intention", "tasks", "projects", "timer",
  "intel", "threads", "threads-intel", "prompted-notes", "content",
  "sticky", "swipe", "video", "video-capture", "spotify", "metrics", "dashboard",
];

function loadCategoryOrder(): BlockType[] {
  const saved = loadJSON<BlockType[]>("sidebar-category-order", []);
  if (saved.length > 0) return saved;
  return DEFAULT_CATEGORY_ORDER;
}

export function Sidebar() {
  useLang();
  const { sidebarOpen, closeSidebar } = useUIStore();
  const { blocks } = useBlockStore();
  const { activeDate } = useSessionStore();
  const [search, setSearch] = useState("");
  const [compact, setCompact] = useState(false);
  const [categories, setCategories] = useState<BlockType[]>(loadCategoryOrder);
  const dragItemRef = useRef<number | null>(null);
  const dragOverRef = useRef<number | null>(null);

  const filtered = blocks.filter((b) => {
    if (b.archived) return false;
    if (!search) return true;
    const cfg = BLOCK_REGISTRY[b.type];
    const label = cfg?.title ?? b.type;
    return (
      label.toLowerCase().includes(search.toLowerCase()) ||
      b.type.toLowerCase().includes(search.toLowerCase())
    );
  });

  const handleDragStart = (idx: number) => { dragItemRef.current = idx; };
  const handleDragEnter = (idx: number) => { dragOverRef.current = idx; };
  const handleDragEnd = () => {
    const from = dragItemRef.current;
    const to = dragOverRef.current;
    if (from === null || to === null || from === to) return;
    const next = [...categories];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setCategories(next);
    saveJSON("sidebar-category-order", next);
    dragItemRef.current = null;
    dragOverRef.current = null;
  };

  const panViewToBlock = (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;
    const vp = useViewportStore.getState().viewport;
    const targetX = block.x + block.w / 2 - (window.innerWidth / 2) / vp.scale;
    const targetY = block.y + block.h / 2 - (window.innerHeight / 2) / vp.scale;
    useViewportStore.setState((s) => ({
      viewport: { ...s.viewport, x: Math.max(0, targetX), y: Math.max(0, targetY) },
    }));
    closeSidebar();
  };

  return (
    <>
      {/* Overlay backdrop */}
      <div
        onClick={closeSidebar}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 140,
          background: sidebarOpen ? "rgba(36,50,49,0.15)" : "transparent",
          backdropFilter: sidebarOpen ? "blur(1px)" : "none",
          WebkitBackdropFilter: sidebarOpen ? "blur(1px)" : "none",
          pointerEvents: sidebarOpen ? "auto" : "none",
          transition: "background var(--dur-medium) var(--ease-standard), backdrop-filter var(--dur-medium) var(--ease-standard)",
          animation: sidebarOpen ? "sidebarOverlayIn var(--dur-medium) var(--ease-standard) forwards" : undefined,
        }}
      />

      {/* Sidebar panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: 248,
          zIndex: 150,
          background: "rgba(251, 248, 242, 0.97)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderRight: "1px solid var(--line)",
          display: "flex",
          flexDirection: "column",
          padding: "16px 12px",
          boxShadow: "var(--shadow-overlay)",
          userSelect: "none",
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 340ms var(--ease-spring)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)" }}>{pick("區塊", "Blocks")}</span>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <button
              onClick={() => setCompact((v) => !v)}
              style={sidebarIconBtn(compact)}
              title={pick("緊湊模式", "Compact mode")}
            >
              {compact ? <Rows3 size={14} /> : <LayoutGrid size={14} />}
            </button>
            <button onClick={closeSidebar} style={sidebarIconBtn(false)} title={pick("關閉", "Close")}>
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={pick("搜尋區塊…", "Search blocks…")}
          style={{
            width: "100%",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-sm)",
            padding: "6px 10px",
            fontSize: 12,
            background: "rgba(255,255,255,0.8)",
            outline: "none",
            fontFamily: "inherit",
            color: "var(--ink)",
            transition: "border-color var(--dur-fast), box-shadow var(--dur-fast)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--accent)";
            e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-soft)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--line)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />

        {/* Category groups */}
        <div style={{ flex: 1, overflowY: "auto", marginTop: 10 }}>
          {categories.map((type, idx) => {
            const items = filtered.filter((b) => b.type === type);
            if (items.length === 0) return null;
            const cfg = BLOCK_REGISTRY[type];
            const label = cfg?.title ?? type;
            const Icon = BLOCK_ICONS[type];
            return (
              <div
                key={type}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragEnter={() => handleDragEnter(idx)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                style={{ marginBottom: compact ? 2 : 8, cursor: "grab" }}
              >
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 3,
                  paddingLeft: 2,
                }}>
                  <Icon size={10} />
                  {label}
                  <span style={{ color: "var(--text-placeholder)", fontWeight: 400 }}>({items.length})</span>
                </div>
                {!compact && items.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => panViewToBlock(b.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      width: "100%",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      padding: "3px 6px",
                      borderRadius: "var(--radius-sm)",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      transition: "background var(--dur-instant)",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(36,50,49,0.05)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
                    title={pick("定位", "Pan to block")}
                  >
                    <span style={{ fontSize: 10, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                      #{b.id.slice(-4)}
                    </span>
                  </button>
                ))}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", padding: "8px 4px" }}>
              {pick("沒有區塊", "No blocks")}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function sidebarIconBtn(active: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    borderRadius: "var(--radius-sm)",
    color: "var(--text-secondary)",
    background: active ? "rgba(36,50,49,0.08)" : "none",
    transition: "background var(--dur-instant)",
  };
}
