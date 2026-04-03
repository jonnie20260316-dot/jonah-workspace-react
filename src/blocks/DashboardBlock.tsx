import { useBlockField } from "../hooks/useBlockField";
import type { Block } from "../types";

interface DashboardBlockProps {
  block: Block;
}

/**
 * Dashboard block - agent/task management dashboard with view tabs.
 * Fields: view, command
 */
export function DashboardBlock({ block }: DashboardBlockProps) {
  const [view, setView] = useBlockField(block.id, "view", "queue");
  const [command, setCommand] = useBlockField(block.id, "command", "");

  const views = [
    {
      key: "queue",
      label: "Queue",
      content:
        "Upcoming tasks, queue state, and where things are getting stuck.\n\n- Vox: waiting for content work\n- Atlas: waiting for validation design\n- Orchestrator: waiting for new queue",
    },
    {
      key: "history",
      label: "History",
      content:
        "Previous tasks, completed outputs, and what came back clean.\n\n- Daily intel report\n- Workspace board iteration\n- Harmony rollout memory update",
    },
    {
      key: "agents",
      label: "Agents",
      content:
        "Agent view: status, recent activity, and where you can send work.\n\n- main: idle\n- vox: active lane\n- trend-scout: waiting\n- orchestrator: monitoring",
    },
    {
      key: "process",
      label: "Coding flow",
      content:
        "Coding process / what is happening now.\n\n- Design pass\n- Board behaviour tuning\n- Integration candidates parked for later",
    },
  ];

  const activeView = views.find((v) => v.key === view) || views[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          padding: "8px",
          backgroundColor: "#f5f5f5",
          borderRadius: "4px",
        }}
      >
        {views.map((v) => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            style={{
              padding: "6px 12px",
              fontSize: "calc(12px * var(--text-scale))",
              backgroundColor: view === v.key ? "#333" : "#ddd",
              color: view === v.key ? "#fff" : "#000",
              border: "none",
              borderRadius: "2px",
              cursor: "pointer",
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Dashboard panel content */}
      <div
        style={{
          padding: "12px",
          backgroundColor: "#f9f9f9",
          borderRadius: "4px",
          minHeight: "150px",
          fontSize: "calc(13px * var(--text-scale))",
          whiteSpace: "pre-wrap",
          lineHeight: "1.5",
          color: "#333",
        }}
      >
        {activeView.content}
      </div>

      {/* Command input */}
      <div
        style={{
          padding: "12px",
          backgroundColor: "#fafafa",
          borderRadius: "4px",
        }}
      >
        <label style={{ fontSize: "calc(12px * var(--text-scale))", fontWeight: "500" }}>
          Quick command
        </label>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Later this can send commands into the agent system."
          style={{
            width: "100%",
            marginTop: "4px",
            padding: "6px",
            border: "1px solid #e0e0e0",
            borderRadius: "2px",
            fontFamily: "inherit",
            fontSize: "calc(13px * var(--text-scale))",
          }}
        />
      </div>
    </div>
  );
}
