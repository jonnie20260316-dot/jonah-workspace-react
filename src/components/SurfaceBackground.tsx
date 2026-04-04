/**
 * SurfaceBackground — bottom SVG layer of the Edgeless whiteboard.
 * Renders below all blocks: frames, shapes (rect/ellipse/diamond), brushes.
 * pointer-events: none globally; interactive elements set pointer-events: all individually.
 * Phase 1: skeleton only. Rendering added in Phase 4 (shapes), Phase 5 (brush), Phase 7 (frames).
 */
export function SurfaceBackground() {
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
      <g className="surface-shapes" />
      <g className="surface-brushes" />
    </svg>
  );
}
