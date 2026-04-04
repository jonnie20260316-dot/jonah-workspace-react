/**
 * Catmull-Rom spline → SVG cubic Bezier path.
 * Converts raw pointer positions into a smooth freehand stroke.
 */
export function pointsToSmoothPath(points: [number, number][]): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    const [p0, p1] = points;
    return `M ${p0[0]},${p0[1]} L ${p1[0]},${p1[1]}`;
  }

  let d = `M ${points[0][0]},${points[0][1]}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    // Catmull-Rom → cubic Bezier control points (tension = 1/6)
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2[0]},${p2[1]}`;
  }

  return d;
}

/** Compute axis-aligned bounding box from a list of [x, y] points */
export function pointsBounds(points: [number, number][]): { x: number; y: number; w: number; h: number } {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x || 1, h: Math.max(...ys) - y || 1 };
}
