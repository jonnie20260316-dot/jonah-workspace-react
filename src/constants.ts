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
]);

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
];
