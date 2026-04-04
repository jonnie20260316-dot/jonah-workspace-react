import { useSessionStore, type ActiveTool } from "../stores/useSessionStore";
import { pick } from "../utils/i18n";
import {
  MousePointer2,
  Hand,
  Square,
  Circle,
  Diamond,
  Type,
  Pen,
  Spline,
  Frame,
} from "lucide-react";

interface ToolDef {
  tool: ActiveTool;
  zhLabel: string;
  enLabel: string;
  shortcut: string;
  icon: React.ComponentType<{ size?: number }>;
}

const TOOL_GROUPS: ToolDef[][] = [
  [
    { tool: "select",    zhLabel: "選取",   enLabel: "Select",    shortcut: "V", icon: MousePointer2 },
    { tool: "pan",       zhLabel: "拖曳",   enLabel: "Pan",       shortcut: "H", icon: Hand },
  ],
  [
    { tool: "rect",      zhLabel: "矩形",   enLabel: "Rectangle", shortcut: "R", icon: Square },
    { tool: "ellipse",   zhLabel: "橢圓",   enLabel: "Ellipse",   shortcut: "E", icon: Circle },
    { tool: "diamond",   zhLabel: "菱形",   enLabel: "Diamond",   shortcut: "D", icon: Diamond },
  ],
  [
    { tool: "text",      zhLabel: "文字",   enLabel: "Text",      shortcut: "T", icon: Type },
    { tool: "brush",     zhLabel: "塗鴉",   enLabel: "Brush",     shortcut: "P", icon: Pen },
    { tool: "connector", zhLabel: "連線",   enLabel: "Connector", shortcut: "L", icon: Spline },
    { tool: "frame",     zhLabel: "分區",   enLabel: "Frame",     shortcut: "F", icon: Frame },
  ],
];

export function ToolBar() {
  const { activeTool, setActiveTool } = useSessionStore();

  return (
    <div className="tool-bar">
      {TOOL_GROUPS.map((group, gi) => (
        <div key={gi} style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {gi > 0 && <div className="tool-bar-divider" />}
          {group.map(({ tool, zhLabel, enLabel, shortcut, icon: Icon }) => (
            <button
              key={tool}
              className={`tool-btn${activeTool === tool ? " active" : ""}`}
              onClick={() => setActiveTool(tool)}
              title={`${pick(zhLabel, enLabel)} (${shortcut})`}
            >
              <Icon size={16} />
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
