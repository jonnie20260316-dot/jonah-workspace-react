/**
 * SurfaceForeground — top SVG layer of the Edgeless whiteboard.
 * Renders above all blocks: connectors, selection handles, drag-select rect.
 * pointer-events: none globally; interactive handles set pointer-events: all individually.
 * Phase 1: skeleton only. Rendering added in Phase 4 (handles), Phase 6 (connectors), Phase 9 (drag-select).
 */
export function SurfaceForeground() {
  return (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        overflow: "visible",
        pointerEvents: "none",
        zIndex: 99999,
      }}
    >
      <g className="surface-connectors" />
      <g className="surface-selection-handles" />
      <g className="surface-drag-rect" />
    </svg>
  );
}
