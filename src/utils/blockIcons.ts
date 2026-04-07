import {
  BookOpen, Layers2, CheckSquare, Kanban, Target, Zap, Timer,
  FileText, StickyNote, Repeat2, MessageSquare, Film,
  BarChart2, Music2, LayoutDashboard, Brain, ClipboardList, Video, Play, Bot,
  Cpu, FlaskConical, Camera,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { BlockType } from "../types";

export const BLOCK_ICONS: Record<BlockType, LucideIcon> = {
  journal: BookOpen,
  kit: Layers2,
  tasks: CheckSquare,
  projects: Kanban,
  intention: Target,
  intel: Zap,
  timer: Timer,
  content: FileText,
  sticky: StickyNote,
  swipe: Repeat2,
  threads: MessageSquare,
  video: Film,
  metrics: BarChart2,
  spotify: Music2,
  dashboard: LayoutDashboard,
  "threads-intel": Brain,
  "prompted-notes": ClipboardList,
  "video-capture": Video,
  "youtube-studio": Play,
  "ai-chat": Bot,
  brain: Cpu,
  lab: FlaskConical,
  screenshot: Camera,
};
