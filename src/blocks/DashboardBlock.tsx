import { useEffect, useState } from "react";
import { Maximize2 } from "lucide-react";
import { useBlockField } from "../hooks/useBlockField";
import { useFullscreenStore } from "../stores/useFullscreenStore";
import type { Block } from "../types";

const OC = "/Users/jonnie/.openclaw";

// ── design tokens ─────────────────────────────────────────────────────────────
const PRI: Record<string, { bg: string; text: string; border: string }> = {
  high:   { bg: "#fff1f0", text: "#e74c3c", border: "#e74c3c" },
  medium: { bg: "#fff8f0", text: "#e67e22", border: "#e67e22" },
  low:    { bg: "#f5f5f5", text: "#999",    border: "#ddd" },
};

const STATUS_COLOR: Record<string, string> = {
  active: "#27ae60", pending: "#3498db", review: "#9b59b6",
  cancelled: "#bdc3c7", done: "#27ae60", completed: "#27ae60",
};

// ── shared UI atoms ───────────────────────────────────────────────────────────
const PANEL: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: "8px",
  overflowY: "auto", maxHeight: "var(--panel-max-height, 340px)",
};

function Chip({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 8px", borderRadius: "20px", fontSize: "10px", fontWeight: 700,
      color, backgroundColor: bg, letterSpacing: "0.3px",
    }}>{label.toUpperCase()}</span>
  );
}

function Dot({ color }: { color: string }) {
  return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />;
}

function relativeTime(ms: number): string {
  const d = Date.now() - ms;
  const m = Math.floor(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function EmptyState({ msg }: { msg: string }) {
  return <div style={{ color: "#bbb", fontSize: "12px", fontStyle: "italic", padding: "20px 0", textAlign: "center" }}>{msg}</div>;
}

// ── Queue tab ─────────────────────────────────────────────────────────────────
interface Task { id: string; title: string; status: string; priority?: string; assigned_to?: string; }

function QueueTab() {
  const [tasks, setTasks] = useState<Task[] | null>(null);

  useEffect(() => {
    window.electronAPI?.readFile(OC + "/shared", "tasks.json")
      .then((raw) => {
        if (!raw) return setTasks([]);
        const all: Task[] = JSON.parse(raw);
        setTasks(all.filter(t => !["cancelled", "done", "completed"].includes(t.status)));
      })
      .catch(() => setTasks([]));
  }, []);

  if (tasks === null) return <EmptyState msg="Loading…" />;
  if (tasks.length === 0) return <EmptyState msg="No active tasks" />;

  return (
    <div style={PANEL}>
      <div style={{ color: "#999", fontSize: "11px", marginBottom: 4 }}>{tasks.length} active</div>
      {tasks.slice(0, 25).map(t => {
        const pri = PRI[t.priority || "low"] || PRI.low;
        return (
          <div key={t.id} style={{
            display: "flex", flexDirection: "column", gap: "5px",
            padding: "10px 12px", backgroundColor: "#fff",
            borderRadius: "8px", borderLeft: `3px solid ${pri.border}`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
              <Chip label={t.priority || "—"} color={pri.text} bg={pri.bg} />
              <span style={{ flex: 1, fontWeight: 600, fontSize: "13px", color: "#111", lineHeight: 1.3 }}>
                {t.title}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Dot color={STATUS_COLOR[t.status] || "#bdc3c7"} />
              <span style={{ fontSize: "11px", color: "#888" }}>
                {t.assigned_to || "unassigned"} · {t.status}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Agents tab ────────────────────────────────────────────────────────────────
const AGENTS = [
  { id: "main",          emoji: "🧠" },
  { id: "vox",           emoji: "🎙️" },
  { id: "atlas",         emoji: "🗺️" },
  { id: "orchestrator",  emoji: "🎼" },
  { id: "trend-scout",   emoji: "📡" },
  { id: "coaching-diary",emoji: "📚" },
];

function AgentsTab() {
  const [state, setState] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    window.electronAPI?.readFile(OC + "/workspace/memory", "heartbeat-state.json")
      .then((raw) => setState(raw ? JSON.parse(raw) : {}))
      .catch(() => setState({}));
  }, []);

  if (state === null) return <EmptyState msg="Loading…" />;

  const lastBeat = state.heartbeatTimestamp ? new Date(state.heartbeatTimestamp).getTime() : 0;
  const mainOnline = lastBeat > 0 && (Date.now() - lastBeat) < 2 * 60 * 60 * 1000;

  return (
    <div style={PANEL}>
      {lastBeat > 0 && (
        <div style={{ fontSize: "11px", color: "#aaa", marginBottom: 4 }}>
          Last heartbeat: {relativeTime(lastBeat)}
        </div>
      )}
      {AGENTS.map(({ id, emoji }) => {
        const online = id === "main" && mainOnline;
        return (
          <div key={id} style={{
            display: "flex", alignItems: "center", gap: "12px",
            padding: "10px 14px", backgroundColor: "#fff",
            borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}>
            <span style={{ fontSize: "18px", flexShrink: 0 }}>{emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: "13px", color: "#111" }}>{id}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <Dot color={online ? "#27ae60" : "#e0e0e0"} />
              <span style={{ fontSize: "11px", color: online ? "#27ae60" : "#bbb" }}>
                {online ? "online" : "—"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Standups tab ──────────────────────────────────────────────────────────────
interface DirEntry { name: string; size: number; mtime: number; }

function StandupsTab() {
  const [files, setFiles] = useState<DirEntry[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const dir = OC + "/workspace/agents/orchestrator/workspace";

  useEffect(() => {
    window.electronAPI?.listDir?.(dir)
      .then((e: DirEntry[]) => setFiles(e.filter(f => f.name.endsWith(".md") && f.name.includes("queue-run"))))
      .catch(() => setFiles([]));
  }, []);

  if (files === null) return <EmptyState msg="Loading…" />;
  if (!selected) {
    if (files.length === 0) return <EmptyState msg="No standup logs yet" />;
    return (
      <div style={PANEL}>
        {files.slice(0, 30).map(f => (
          <div key={f.name} onClick={() => {
            setSelected(f.name);
            window.electronAPI?.readFile(dir, f.name).then(r => setContent(r || "(empty)")).catch(() => setContent("(error)"));
          }} style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "10px 14px", backgroundColor: "#fff",
            borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", cursor: "pointer",
          }}>
            <span style={{ fontSize: "16px" }}>📋</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: "12px" }}>{f.name.replace(".md", "")}</div>
              <div style={{ fontSize: "11px", color: "#aaa", marginTop: 2 }}>{relativeTime(f.mtime)}</div>
            </div>
            <span style={{ color: "#ccc" }}>›</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div>
      <button onClick={() => setSelected(null)} style={{
        marginBottom: 12, padding: "5px 12px", fontSize: "12px",
        background: "#f2f2f2", border: "none", borderRadius: 6, cursor: "pointer",
      }}>← Standups</button>
      <div style={{ fontSize: "12px", whiteSpace: "pre-wrap", lineHeight: 1.7, color: "#333" }}>{content}</div>
    </div>
  );
}

// ── Cron tab ──────────────────────────────────────────────────────────────────
interface CronJob { id: string; name: string; enabled: boolean; schedule?: { expr?: string }; state?: { lastRunStatus?: string; lastRunAtMs?: number }; }

function CronTab() {
  const [jobs, setJobs] = useState<CronJob[] | null>(null);

  useEffect(() => {
    window.electronAPI?.readFile(OC + "/cron", "jobs.json")
      .then((raw) => { if (!raw) return setJobs([]); const p = JSON.parse(raw); setJobs(p.jobs || []); })
      .catch(() => setJobs([]));
  }, []);

  if (jobs === null) return <EmptyState msg="Loading…" />;
  if (jobs.length === 0) return <EmptyState msg="No cron jobs" />;

  const ok = jobs.filter(j => j.enabled && j.state?.lastRunStatus === "ok").length;
  const err = jobs.filter(j => j.enabled && j.state?.lastRunStatus === "error").length;
  const dis = jobs.filter(j => !j.enabled).length;

  return (
    <div style={PANEL}>
      <div style={{ display: "flex", gap: "8px", marginBottom: 4 }}>
        <Chip label={`${ok} healthy`} color="#27ae60" bg="#e8f8f0" />
        {err > 0 && <Chip label={`${err} failed`} color="#e74c3c" bg="#fdf0ef" />}
        {dis > 0 && <Chip label={`${dis} disabled`} color="#999" bg="#f5f5f5" />}
      </div>
      {jobs.map(j => {
        const s = !j.enabled ? "#e0e0e0" : j.state?.lastRunStatus === "error" ? "#e74c3c" : "#27ae60";
        return (
          <div key={j.id} style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "9px 14px", backgroundColor: "#fff",
            borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}>
            <Dot color={s} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: "12px", color: "#111" }}>{j.name}</div>
              <div style={{ fontSize: "11px", color: "#aaa", marginTop: 2 }}>
                {j.schedule?.expr || "—"}
                {j.state?.lastRunAtMs ? ` · ${relativeTime(j.state.lastRunAtMs)}` : ""}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main block ────────────────────────────────────────────────────────────────
export function DashboardBlock({ block }: { block: Block }) {
  const [view, setView] = useBlockField(block.id, "view", "queue", { global: true });
  const { open } = useFullscreenStore();

  const tabs = [
    { key: "queue", label: "Queue" },
    { key: "agents", label: "Agents" },
    { key: "standups", label: "Standups" },
    { key: "cron", label: "Cron" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setView(t.key)} style={{
              padding: "5px 12px", fontSize: "12px",
              backgroundColor: view === t.key ? "#333" : "#f0f0f0",
              color: view === t.key ? "#fff" : "#555",
              border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: view === t.key ? 600 : 400,
            }}>{t.label}</button>
          ))}
        </div>
        <button onClick={() => open("dashboard")} title="Fullscreen" style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 28, height: 28, borderRadius: "6px",
          background: "#f0f0f0", border: "none", cursor: "pointer", color: "#888", flexShrink: 0,
        }}>
          <Maximize2 size={13} />
        </button>
      </div>

      <div style={{ backgroundColor: "#f8f8f8", borderRadius: "10px", padding: "12px", minHeight: "160px" }}>
        {view === "queue"    && <QueueTab />}
        {view === "agents"   && <AgentsTab />}
        {view === "standups" && <StandupsTab />}
        {view === "cron"     && <CronTab />}
      </div>
    </div>
  );
}
