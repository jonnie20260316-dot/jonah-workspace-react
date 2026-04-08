export type Lang = "zh" | "en";

export type BlockType =
  | "journal"
  | "kit"
  | "tasks"
  | "projects"
  | "intention"
  | "intel"
  | "timer"
  | "content"
  | "sticky"
  | "swipe"
  | "threads"
  | "video"
  | "metrics"
  | "spotify"
  | "dashboard"
  | "threads-intel"
  | "prompted-notes"
  | "video-capture"
  | "youtube-studio"
  | "ai-chat"
  | "brain"
  | "lab"
  | "screenshot";

export interface Block {
  id: string;
  type: BlockType;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  collapsed: boolean;
  archived: boolean;
  color: string;
  textScale?: number;
  pinned?: boolean;
  pinnedOrder?: number;
  zoneId?: string;
  /** Optional user-set label that overrides the block type title in the header. */
  label?: string;
}
