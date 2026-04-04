import { useState, useMemo } from "react";
import { useBlockStore } from "../stores/useBlockStore";
import { useSurfaceStore } from "../stores/useSurfaceStore";
import { useViewportStore } from "../stores/useViewportStore";
import { ZONE_PALETTES } from "../constants";

const MAP_WIDTH = 160;
const MAP_HEIGHT = 120;

export function Minimap() {
  const [collapsed, setCollapsed] = useState(true);
  const { blocks } = useBlockStore();
  const { elements } = useSurfaceStore();
  const { viewport, boardSize } = useViewportStore();

  const scaleX = MAP_WIDTH / boardSize.w;
  const scaleY = MAP_HEIGHT / boardSize.h;

  // Calculate viewport rect in minimap coords
  const vpWidth = (window.innerWidth / viewport.scale) * scaleX;
  const vpHeight = (window.innerHeight / viewport.scale) * scaleY;
  const vpLeft = Math.max(0, Math.min(viewport.x * scaleX, MAP_WIDTH - vpWidth));
  const vpTop = Math.max(0, Math.min(viewport.y * scaleY, MAP_HEIGHT - vpHeight));

  const visibleBlocks = useMemo(
    () => blocks.filter((b) => !b.archived && !b.pinned),
    [blocks]
  );

  const frameElements = useMemo(
    () => elements.filter((el) => el.type === "frame"),
    [elements]
  );

  const handleMinimapClick = (e: React.PointerEvent<SVGElement>) => {
    if (!e.currentTarget) return;

    const svg = e.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert to board coords
    const bx = (clickX / MAP_WIDTH) * boardSize.w;
    const by = (clickY / MAP_HEIGHT) * boardSize.h;

    // Center viewport on clicked point
    const { scale } = useViewportStore.getState().viewport;
    useViewportStore.getState().setViewport({
      x: bx - window.innerWidth / 2 / scale,
      y: by - window.innerHeight / 2 / scale,
      scale,
    });
  };

  return (
    <div className="minimap-container">
      <button
        className="minimap-toggle"
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? "Show minimap" : "Hide minimap"}
      >
        🗺
      </button>

      {!collapsed && (
        <div className="minimap-panel">
          <svg
            className="minimap-svg"
            width={MAP_WIDTH}
            height={MAP_HEIGHT}
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            onPointerDown={handleMinimapClick}
            style={{ cursor: "pointer" }}
          >
            {/* Background */}
            <rect
              width={MAP_WIDTH}
              height={MAP_HEIGHT}
              fill="#1a1f1e"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={1}
            />

            {/* Frame elements (zones) */}
            <g className="minimap-frames">
              {frameElements.map((frame) => {
                const paletteEntry =
                  ZONE_PALETTES.find((p) => p.id === frame.frameColor) ||
                  ZONE_PALETTES[0];
                return (
                  <rect
                    key={frame.id}
                    x={frame.x * scaleX}
                    y={frame.y * scaleY}
                    width={Math.max(2, frame.w * scaleX)}
                    height={Math.max(2, frame.h * scaleY)}
                    fill={paletteEntry.border}
                    opacity={0.2}
                    stroke={paletteEntry.border}
                    strokeWidth={0.5}
                  />
                );
              })}
            </g>

            {/* Block positions */}
            <g className="minimap-blocks">
              {visibleBlocks.map((block) => (
                <rect
                  key={block.id}
                  x={block.x * scaleX}
                  y={block.y * scaleY}
                  width={Math.max(2, block.w * scaleX)}
                  height={Math.max(2, block.h * scaleY)}
                  fill="rgba(255,255,255,0.3)"
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth={0.5}
                />
              ))}
            </g>

            {/* Current viewport rect */}
            <rect
              x={vpLeft}
              y={vpTop}
              width={Math.max(2, vpWidth)}
              height={Math.max(2, vpHeight)}
              fill="rgba(79,156,249,0.15)"
              stroke="var(--accent, #4f9cf9)"
              strokeWidth={1.5}
            />
          </svg>
        </div>
      )}
    </div>
  );
}
