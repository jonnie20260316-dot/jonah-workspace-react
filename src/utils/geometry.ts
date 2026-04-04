export interface ConnectionPoint {
  x: number;
  y: number;
  side: "n" | "e" | "s" | "w";
}

/** Returns the 4 cardinal connection points for an element's bounding box */
export function getConnectionPoints(
  bounds: { x: number; y: number; w: number; h: number }
): ConnectionPoint[] {
  const { x, y, w, h } = bounds;
  return [
    { x: x + w / 2, y,             side: "n" },
    { x: x + w,     y: y + h / 2,  side: "e" },
    { x: x + w / 2, y: y + h,      side: "s" },
    { x,             y: y + h / 2,  side: "w" },
  ];
}

/** Returns the connection point on bounds nearest to (mx, my), with its distance */
export function nearestConnectionPoint(
  mx: number,
  my: number,
  bounds: { x: number; y: number; w: number; h: number }
): ConnectionPoint & { dist: number } {
  const pts = getConnectionPoints(bounds);
  let best = pts[0];
  let bestDist = Math.hypot(pts[0].x - mx, pts[0].y - my);
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i].x - mx, pts[i].y - my);
    if (d < bestDist) { bestDist = d; best = pts[i]; }
  }
  return { ...best, dist: bestDist };
}

/** Generates an SVG path d-string between two points */
export function connectorPath(
  fx: number,
  fy: number,
  tx: number,
  ty: number,
  curveType: "straight" | "curved" | "elbow" = "curved"
): string {
  if (curveType === "straight") {
    return `M ${fx},${fy} L ${tx},${ty}`;
  }
  if (curveType === "elbow") {
    const mx = (fx + tx) / 2;
    return `M ${fx},${fy} L ${mx},${fy} L ${mx},${ty} L ${tx},${ty}`;
  }
  // Curved: bezier departing in the dominant direction
  const dx = tx - fx;
  const dy = ty - fy;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  let cp1x: number, cp1y: number, cp2x: number, cp2y: number;
  if (absDx >= absDy) {
    const offset = Math.max(absDx * 0.5, 60);
    cp1x = fx + offset; cp1y = fy;
    cp2x = tx - offset; cp2y = ty;
  } else {
    const offset = Math.max(absDy * 0.5, 60);
    cp1x = fx; cp1y = fy + offset;
    cp2x = tx; cp2y = ty - offset;
  }
  return `M ${fx},${fy} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${tx},${ty}`;
}
