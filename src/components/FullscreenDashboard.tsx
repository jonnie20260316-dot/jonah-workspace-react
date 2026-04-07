import { useEffect, useRef } from "react";
import { LayoutDashboard, Cpu, FlaskConical, X } from "lucide-react";
import { useFullscreenStore, type FSModule } from "../stores/useFullscreenStore";
import { DashboardBlock } from "../blocks/DashboardBlock";
import { BrainBlock } from "../blocks/BrainBlock";
import { LabBlock } from "../blocks/LabBlock";
import type { Block } from "../types";

// Stable dummy block objects — fixed IDs so useBlockField state persists
const DUMMY: Record<FSModule, Block> = {
  dashboard: { id: "fs-dashboard", type: "dashboard", x: 0, y: 0, w: 0, h: 0, z: 0, collapsed: false, archived: false, color: "" },
  brain:     { id: "fs-brain",     type: "brain",     x: 0, y: 0, w: 0, h: 0, z: 0, collapsed: false, archived: false, color: "" },
  lab:       { id: "fs-lab",       type: "lab",       x: 0, y: 0, w: 0, h: 0, z: 0, collapsed: false, archived: false, color: "" },
};

const DOCK_MODULES: { key: FSModule; label: string; Icon: typeof LayoutDashboard; accent: string }[] = [
  { key: "dashboard", label: "Ops",   Icon: LayoutDashboard, accent: "#555" },
  { key: "brain",     label: "Brain", Icon: Cpu,             accent: "#4a6cf7" },
  { key: "lab",       label: "Lab",   Icon: FlaskConical,    accent: "#27ae60" },
];

const MODULE_META: Record<FSModule, { title: string; accent: string }> = {
  dashboard: { title: "Ops",   accent: "#444" },
  brain:     { title: "Brain", accent: "#4a6cf7" },
  lab:       { title: "Lab",   accent: "#27ae60" },
};

export function FullscreenDashboard() {
  const { isOpen, activeModule, close, setModule } = useFullscreenStore();
  const containerRef = useRef<HTMLDivElement>(null);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, close]);

  if (!isOpen) return null;

  const { title, accent } = MODULE_META[activeModule];

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        backgroundColor: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      {/* Main card */}
      <div
        ref={containerRef}
        style={{
          width: "min(1100px, 92vw)",
          height: "min(760px, 88vh)",
          backgroundColor: "#fff",
          borderRadius: "16px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.1)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          // CSS variable for block panels to use expanded height
          ["--panel-max-height" as string]: "calc(min(760px, 88vh) - 180px)",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 24px 14px",
          borderBottom: "1px solid #f0f0f0",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              backgroundColor: accent,
            }} />
            <span style={{ fontWeight: 700, fontSize: "17px", color: "#111", letterSpacing: "-0.3px" }}>
              Command Center
            </span>
            <span style={{
              padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 600,
              backgroundColor: accent + "18", color: accent,
            }}>{title}</span>
          </div>
          <button
            onClick={close}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 32, height: 32, borderRadius: "50%",
              background: "#f2f2f2", border: "none", cursor: "pointer",
              color: "#666",
            }}
            title="Close (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content — fills remaining space */}
        <div style={{ flex: 1, overflow: "auto", padding: "20px 24px 16px" }}>
          {activeModule === "dashboard" && <DashboardBlock block={DUMMY.dashboard} />}
          {activeModule === "brain"     && <BrainBlock     block={DUMMY.brain} />}
          {activeModule === "lab"       && <LabBlock        block={DUMMY.lab} />}
        </div>

        {/* macOS Dock */}
        <div style={{
          flexShrink: 0,
          display: "flex", justifyContent: "center",
          padding: "12px 24px 20px",
          borderTop: "1px solid #f0f0f0",
        }}>
          <div style={{
            display: "flex", gap: "4px",
            padding: "8px 16px",
            backgroundColor: "rgba(30,30,30,0.06)",
            borderRadius: "20px",
            border: "1px solid rgba(0,0,0,0.07)",
          }}>
            {DOCK_MODULES.map(({ key, label, Icon, accent: a }) => {
              const isActive = activeModule === key;
              return (
                <button
                  key={key}
                  onClick={() => setModule(key)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "3px",
                    padding: "8px 20px",
                    backgroundColor: isActive ? "#fff" : "transparent",
                    border: "none",
                    borderRadius: "14px",
                    cursor: "pointer",
                    color: isActive ? a : "#888",
                    boxShadow: isActive ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
                    transition: "all 0.15s",
                    minWidth: 72,
                  }}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
                  <span style={{ fontSize: "11px", fontWeight: isActive ? 600 : 400, marginTop: 1 }}>
                    {label}
                  </span>
                  {isActive && (
                    <div style={{
                      width: 4, height: 4, borderRadius: "50%",
                      backgroundColor: a, marginTop: 1,
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
