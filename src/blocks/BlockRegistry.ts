import type { FC } from "react";
import { StickyBlock } from "./StickyBlock";
import { IntentionBlock } from "./IntentionBlock";
import { ThreadsBlock } from "./ThreadsBlock";
import { KitBlock } from "./KitBlock";
import { JournalBlock } from "./JournalBlock";
import { TasksBlock } from "./TasksBlock";
import { ProjectsBlock } from "./ProjectsBlock";
import { IntelBlock } from "./IntelBlock";
import { TimerBlock } from "./TimerBlock";
import { ContentBlock } from "./ContentBlock";
import { SwipeBlock } from "./SwipeBlock";
import { VideoBlock } from "./VideoBlock";
import { MetricsBlock } from "./MetricsBlock";
import { SpotifyBlock } from "./SpotifyBlock";
import { DashboardBlock } from "./DashboardBlock";
import { ThreadsIntelBlock } from "./ThreadsIntelBlock";
import { PromptedNotesBlock } from "./PromptedNotesBlock";
import { VideoCaptureBlock } from "./VideoCaptureBlock";
import type { Block, BlockType } from "../types";

export interface BlockTypeConfig {
  component: FC<{ block: Block }>;
  title: string;
  zhTitle: string;
  subtitle: string;
  zhSubtitle: string;
  size: { w: number; h: number };
  unique?: boolean;
}

export const BLOCK_REGISTRY: Record<BlockType, BlockTypeConfig> = {
  sticky: {
    component: StickyBlock,
    title: "Sticky",
    zhTitle: "便利貼",
    subtitle: "Quick thought",
    zhSubtitle: "隨手記",
    size: { w: 400, h: 300 },
  },
  intention: {
    component: IntentionBlock,
    title: "Intention",
    zhTitle: "意圖",
    subtitle: "Goal & theme",
    zhSubtitle: "目標與主題",
    size: { w: 500, h: 280 },
    unique: true,
  },
  threads: {
    component: ThreadsBlock,
    title: "Threads",
    zhTitle: "對話串",
    subtitle: "Messages",
    zhSubtitle: "訊息",
    size: { w: 500, h: 320 },
  },
  kit: {
    component: KitBlock,
    title: "KIT",
    zhTitle: "KIT",
    subtitle: "Keep · Improve · Try",
    zhSubtitle: "保持・改善・嘗試",
    size: { w: 800, h: 360 },
    unique: true,
  },
  journal: {
    component: JournalBlock,
    title: "Journal",
    zhTitle: "日記",
    subtitle: "Daily reflection",
    zhSubtitle: "每日反思",
    size: { w: 600, h: 400 },
    unique: true,
  },
  tasks: {
    component: TasksBlock,
    title: "Tasks",
    zhTitle: "任務",
    subtitle: "Work tracking",
    zhSubtitle: "工作追蹤",
    size: { w: 500, h: 380 },
  },
  projects: {
    component: ProjectsBlock,
    title: "Projects",
    zhTitle: "專案",
    subtitle: "Kanban board",
    zhSubtitle: "看板",
    size: { w: 800, h: 400 },
  },
  intel: {
    component: IntelBlock,
    title: "Intel",
    zhTitle: "情報",
    subtitle: "Morning brief",
    zhSubtitle: "早晨資訊",
    size: { w: 500, h: 300 },
  },
  timer: {
    component: TimerBlock,
    title: "Timer",
    zhTitle: "計時器",
    subtitle: "Pomodoro focus",
    zhSubtitle: "番茄鐘",
    size: { w: 400, h: 520 },
  },
  content: {
    component: ContentBlock,
    title: "Draft",
    zhTitle: "內容",
    subtitle: "Rich text",
    zhSubtitle: "富文本",
    size: { w: 700, h: 400 },
  },
  swipe: {
    component: SwipeBlock,
    title: "Hook Lab",
    zhTitle: "刷卡",
    subtitle: "LLM automation",
    zhSubtitle: "LLM 自動化",
    size: { w: 800, h: 450 },
  },
  video: {
    component: VideoBlock,
    title: "Video",
    zhTitle: "影片",
    subtitle: "Video reference",
    zhSubtitle: "影片參考",
    size: { w: 500, h: 300 },
  },
  metrics: {
    component: MetricsBlock,
    title: "Metrics",
    zhTitle: "指標",
    subtitle: "Growth tracking",
    zhSubtitle: "統計追蹤",
    size: { w: 500, h: 280 },
  },
  spotify: {
    component: SpotifyBlock,
    title: "Spotify",
    zhTitle: "Spotify",
    subtitle: "Music control",
    zhSubtitle: "音樂控制",
    size: { w: 500, h: 300 },
  },
  dashboard: {
    component: DashboardBlock,
    title: "Dashboard",
    zhTitle: "儀表板",
    subtitle: "Overview",
    zhSubtitle: "總覽",
    size: { w: 600, h: 350 },
  },
  "threads-intel": {
    component: ThreadsIntelBlock,
    title: "Analysis",
    zhTitle: "對話分析",
    subtitle: "Thread analysis",
    zhSubtitle: "分析",
    size: { w: 700, h: 450 },
  },
  "prompted-notes": {
    component: PromptedNotesBlock,
    title: "Prompted Notes",
    zhTitle: "問答筆記",
    subtitle: "Custom forms",
    zhSubtitle: "自定義表單",
    size: { w: 600, h: 360 },
  },
  "video-capture": {
    component: VideoCaptureBlock,
    title: "Video Capture",
    zhTitle: "錄影",
    subtitle: "Record & clip",
    zhSubtitle: "錄製剪輯",
    size: { w: 900, h: 620 },
  },
};

// Helper to get block config
export function getBlockConfig(type: BlockType): BlockTypeConfig {
  return BLOCK_REGISTRY[type] || BLOCK_REGISTRY.sticky;
}

// Helper to list addable block types (filters out unique blocks that already exist)
export function getAddableBlockTypes(
  existingBlockIds: string[]
): BlockType[] {
  const uniqueTypes: BlockType[] = ["journal", "kit", "intention"];
  const existingTypes = new Set(
    existingBlockIds
      .map((id) => id.split("-")[0])
      .filter((t) => uniqueTypes.includes(t as BlockType))
  );

  return (Object.keys(BLOCK_REGISTRY) as BlockType[]).filter((type) => {
    const config = BLOCK_REGISTRY[type];
    if (!config.unique) return true;
    return !existingTypes.has(type);
  });
}
