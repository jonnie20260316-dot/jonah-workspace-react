import type { Lang } from "./types";

export const STORAGE_PREFIX = "jonah-workspace:v2:";
export const LAYOUT_VERSION = "2026-03-24-f";
export const GRID = 24;
export const MIN_ZOOM = 0.07;
export const MAX_ZOOM = 6.0;
export const ZOOM_STEP = 0.12;
export const ZOOM_SENSITIVITY = 0.004;
export const PAN_SPEED = 1.8;
export const VIEWPORT_PADDING = 2400;
export const DEFAULT_LANG: Lang = "zh";
export const DEFAULT_BOARD_SIZE = { w: 20000, h: 15000 };
export const UNDO_LIMIT = 20;

export const GLOBAL_KEYS = new Set<string>([
  "blocks",
  "viewport",
  "board-size",
  "project-board",
  "lang",
  "snap",
  "overlap",
  "hero-collapsed",
  "timer-state",
  "timer-base-minutes",
  "active-date",
  "session-migration-done",
  "layout-version",
  "timer-settings",
  "timer-daily-target",
  "timer-sound",
  "threads-intel-records",
  "threads-intel-archived",
  "threads-intel-archive-days",
  "history-compact",
  "sidebar-category-order",
  "device-id",
  "sync-meta",
  "sync-queue",
  "timer-height-migrated-v1",
  "git-sync-enabled",
  "git-sync-dir",
  "git-sync-remote",
  "github-sync-enabled",
  "github-sync-repo",
  "github-sync-token",
  "text-scale",
  "surface-elements",
  "sticky-daily-migrated",
]);

// ─── Zone / Frame color palettes ─────────────────────────────────────────────

export const ZONE_PALETTES = [
  { id: "ocean",   bg: "rgba(59,130,246,0.08)",  border: "#3b82f6", label: "海洋" },
  { id: "forest",  bg: "rgba(34,197,94,0.08)",   border: "#22c55e", label: "森林" },
  { id: "sunset",  bg: "rgba(249,115,22,0.08)",  border: "#f97316", label: "夕陽" },
  { id: "plum",    bg: "rgba(168,85,247,0.08)",  border: "#a855f7", label: "紫藤" },
  { id: "rose",    bg: "rgba(244,63,94,0.08)",   border: "#f43f5e", label: "玫瑰" },
  { id: "gold",    bg: "rgba(234,179,8,0.08)",   border: "#eab308", label: "金黃" },
  { id: "teal",    bg: "rgba(20,184,166,0.08)",  border: "#14b8a6", label: "藍綠" },
  { id: "slate",   bg: "rgba(100,116,139,0.08)", border: "#64748b", label: "石板" },
  { id: "crimson", bg: "rgba(220,38,38,0.08)",   border: "#dc2626", label: "深紅" },
  { id: "indigo",  bg: "rgba(99,102,241,0.08)",  border: "#6366f1", label: "靛藍" },
  { id: "lime",    bg: "rgba(132,204,22,0.08)",  border: "#84cc16", label: "萊姆" },
  { id: "sky",     bg: "rgba(14,165,233,0.08)",  border: "#0ea5e9", label: "天空" },
] as const;

export const DEFAULT_FRAME_COLOR = "ocean";

export const GLOBAL_KEY_PREFIXES: string[] = [
  "timer-sessions:",
  "timer-sounds:",
  "prompted-notes-config:",
  "prompted-notes-entries:",
  "spotify-presets:",
  "spotify-ui:",
  "content-draft-history:",
  "video-capture-settings:",
  "vc-saved-videos:",
  "ai-chat-tab:",
  "block-global:",
];
