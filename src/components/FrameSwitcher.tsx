import { useState } from "react";
import { useSurfaceStore } from "../stores/useSurfaceStore";
import { useSessionStore } from "../stores/useSessionStore";
import { useViewportStore } from "../stores/useViewportStore";
import { useBlockStore } from "../stores/useBlockStore";
import { ZONE_PALETTES } from "../constants";
import { pick } from "../utils/i18n";
import { useLang } from "../hooks/useLang";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function FrameSwitcher({ open, onClose }: Props) {
  useLang();
  const [query, setQuery] = useState("");
  const elements = useSurfaceStore((s) => s.elements);
  const blocks = useBlockStore((s) => s.blocks);
  const animateToFrame = useViewportStore((s) => s.animateToFrame);
  const setActiveFrameId = useSessionStore((s) => s.setActiveFrameId);

  if (!open) return null;

  const frames = elements.filter((el) => el.type === "frame");
  const filtered = query
    ? frames.filter((f) => (f.name ?? "").toLowerCase().includes(query.toLowerCase()))
    : frames;

  function goTo(frameId: string) {
    const frame = elements.find((el) => el.id === frameId);
    if (!frame) return;
    animateToFrame(frame);
    setActiveFrameId(frameId);
    onClose();
  }

  return (
    <div className="frame-switcher-overlay" onClick={onClose}>
      <div className="frame-switcher" onClick={(e) => e.stopPropagation()}>
        <input
          className="frame-switcher-search"
          autoFocus
          placeholder={pick("搜尋分區…", "Search frames…")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") { e.stopPropagation(); onClose(); }
            if (e.key === "Enter" && filtered.length > 0) goTo(filtered[0].id);
          }}
        />
        <div className="frame-switcher-list">
          {filtered.length === 0 && (
            <div className="frame-switcher-empty">{pick("沒有分區", "No frames")}</div>
          )}
          {filtered.map((frame) => {
            const palette = ZONE_PALETTES.find((p) => p.id === frame.frameColor) ?? ZONE_PALETTES[0];
            const count = blocks.filter((b) => !b.archived && b.zoneId === frame.id).length;
            return (
              <button
                key={frame.id}
                className="frame-switcher-item"
                onClick={() => goTo(frame.id)}
              >
                <div className="frame-switcher-dot" style={{ background: palette.border }} />
                <span className="frame-switcher-name">
                  {frame.name || pick("未命名分區", "Untitled frame")}
                </span>
                <span className="frame-switcher-count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
