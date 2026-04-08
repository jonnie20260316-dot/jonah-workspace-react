// ─── Surface Elements (Edgeless whiteboard layer) ─────────────────────────────

export type SurfaceElementType =
  | "rect" | "ellipse" | "diamond"
  | "text"
  | "connector"
  | "brush"
  | "frame";

export interface SurfaceElement {
  id: string;
  type: SurfaceElementType;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  // Visual
  fillColor:   string;
  strokeColor: string;
  strokeWidth: number;
  strokeStyle: "solid" | "dashed" | "dotted";
  opacity:     number;
  cornerRadius?: number;
  // Text (type=text)
  text?:       string;
  fontSize?:   number;
  fontWeight?: "normal" | "bold";
  textAlign?:  "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  color?:      string;
  // Connector (type=connector)
  fromId?:     string;
  toId?:       string;
  fromPoint?:  [number, number];
  toPoint?:    [number, number];
  curveType?:  "straight" | "curved" | "elbow";
  arrowStart?: boolean;
  arrowEnd?:   boolean;
  label?:      string;
  // Brush (type=brush)
  pathData?:   string;
  // Frame (type=frame)
  name?:       string;
  collapsed?:  boolean;
  frameOrder?: number;
  frameColor?: string;
}

export interface ViewportState {
  x: number;
  y: number;
  scale: number;
}

export interface BoardSize {
  w: number;
  h: number;
}
