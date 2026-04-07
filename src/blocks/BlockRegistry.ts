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
import { YouTubeStudioBlock } from "./YouTubeStudioBlock";
import { AIChatBlock } from "./AIChatBlock";
import { BrainBlock } from "./BrainBlock";
import { LabBlock } from "./LabBlock";
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
    size: { w: 440, h: 330 },
  },
  intention: {
    component: IntentionBlock,
    title: "Intention",
    zhTitle: "意圖",
    subtitle: "Goal & theme",
    zhSubtitle: "目標與主題",
    size: { w: 550, h: 310 },
    unique: true,
  },
  threads: {
    component: ThreadsBlock,
    title: "Threads",
    zhTitle: "對話串",
    subtitle: "Messages",
    zhSubtitle: "訊息",
    size: { w: 550, h: 352 },
  },
  kit: {
    component: KitBlock,
    title: "KIT",
    zhTitle: "KIT",
    subtitle: "Keep · Improve · Try",
    zhSubtitle: "保持・改善・嘗試",
    size: { w: 880, h: 396 },
    unique: true,
  },
  journal: {
    component: JournalBlock,
    title: "Journal",
    zhTitle: "日記",
    subtitle: "Daily reflection",
    zhSubtitle: "每日反思",
    size: { w: 660, h: 440 },
    unique: true,
  },
  tasks: {
    component: TasksBlock,
    title: "Tasks",
    zhTitle: "任務",
    subtitle: "Work tracking",
    zhSubtitle: "工作追蹤",
    size: { w: 550, h: 418 },
  },
  projects: {
    component: ProjectsBlock,
    title: "Projects",
    zhTitle: "專案",
    subtitle: "Kanban board",
    zhSubtitle: "看板",
    size: { w: 880, h: 440 },
  },
  intel: {
    component: IntelBlock,
    title: "Intel",
    zhTitle: "情報",
    subtitle: "Morning brief",
    zhSubtitle: "早晨資訊",
    size: { w: 550, h: 330 },
  },
  timer: {
    component: TimerBlock,
    title: "Timer",
    zhTitle: "計時器",
    subtitle: "Pomodoro focus",
    zhSubtitle: "番茄鐘",
    size: { w: 440, h: 572 },
  },
  content: {
    component: ContentBlock,
    title: "Draft",
    zhTitle: "內容",
    subtitle: "Rich text",
    zhSubtitle: "富文本",
    size: { w: 770, h: 440 },
  },
  swipe: {
    component: SwipeBlock,
    title: "Hook Lab",
    zhTitle: "刷卡",
    subtitle: "LLM automation",
    zhSubtitle: "LLM 自動化",
    size: { w: 880, h: 495 },
  },
  video: {
    component: VideoBlock,
    title: "Video",
    zhTitle: "影片",
    subtitle: "Video reference",
    zhSubtitle: "影片參考",
    size: { w: 550, h: 330 },
  },
  metrics: {
    component: MetricsBlock,
    title: "Metrics",
    zhTitle: "指標",
    subtitle: "Growth tracking",
    zhSubtitle: "統計追蹤",
    size: { w: 550, h: 310 },
  },
  spotify: {
    component: SpotifyBlock,
    title: "Spotify",
    zhTitle: "Spotify",
    subtitle: "Music control",
    zhSubtitle: "音樂控制",
    size: { w: 550, h: 330 },
  },
  dashboard: {
    component: DashboardBlock,
    title: "Dashboard",
    zhTitle: "儀表板",
    subtitle: "Overview",
    zhSubtitle: "總覽",
    size: { w: 660, h: 385 },
  },
  "threads-intel": {
    component: ThreadsIntelBlock,
    title: "Analysis",
    zhTitle: "對話分析",
    subtitle: "Thread analysis",
    zhSubtitle: "分析",
    size: { w: 770, h: 495 },
  },
  "prompted-notes": {
    component: PromptedNotesBlock,
    title: "Prompted Notes",
    zhTitle: "問答筆記",
    subtitle: "Custom forms",
    zhSubtitle: "自定義表單",
    size: { w: 660, h: 396 },
  },
  "video-capture": {
    component: VideoCaptureBlock,
    title: "Video Capture",
    zhTitle: "錄影",
    subtitle: "Record & clip",
    zhSubtitle: "錄製剪輯",
    size: { w: 990, h: 682 },
  },
  "youtube-studio": {
    component: YouTubeStudioBlock,
    title: "YouTube Studio",
    zhTitle: "YouTube 工作室",
    subtitle: "Live streaming",
    zhSubtitle: "直播控制台",
    size: { w: 900, h: 600 },
  },
  "ai-chat": {
    component: AIChatBlock,
    title: "AI Chat",
    zhTitle: "AI 對話",
    subtitle: "Claude & ChatGPT",
    zhSubtitle: "Claude 與 ChatGPT",
    size: { w: 880, h: 660 },
  },
  brain: {
    component: BrainBlock,
    title: "Brain",
    zhTitle: "知識中心",
    subtitle: "Briefs · Memory · Skills · Cron",
    zhSubtitle: "簡報・記憶・技能・排程",
    size: { w: 820, h: 560 },
  },
  lab: {
    component: LabBlock,
    title: "Lab",
    zhTitle: "實驗室",
    subtitle: "Research · Ideas · Builds",
    zhSubtitle: "研究・想法・構建",
    size: { w: 820, h: 520 },
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
