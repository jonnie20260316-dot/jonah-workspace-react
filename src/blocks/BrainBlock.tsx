import { useEffect, useState } from "react";
import { Maximize2 } from "lucide-react";
import { useBlockField } from "../hooks/useBlockField";
import { useFullscreenStore } from "../stores/useFullscreenStore";
import type { Block } from "../types";

const OC = "/Users/jonnie/.openclaw";

const PANEL: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: "8px",
  overflowY: "auto", maxHeight: "var(--panel-max-height, 340px)",
};

function Chip({ label, color, bg }: { label: string; color: string; bg: string }) {
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: "20px", fontSize: "10px", fontWeight: 700, color, backgroundColor: bg }}>{label}</span>;
}

function Dot({ color }: { color: string }) {
  return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />;
}

function relativeTime(ms: number): string {
  const d = Date.now() - ms;
  const m = Math.floor(d / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b}B`;
  return `${(b / 1024).toFixed(1)}K`;
}

function EmptyState({ msg }: { msg: string }) {
  return <div style={{ color: "#bbb", fontSize: "12px", fontStyle: "italic", padding: "20px 0", textAlign: "center" }}>{msg}</div>;
}

interface DirEntry { name: string; size: number; mtime: number; }

// ── Briefs ────────────────────────────────────────────────────────────────────
function BriefsTab() {
  const [files, setFiles] = useState<DirEntry[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const dir = OC + "/reports/briefs";

  useEffect(() => {
    window.electronAPI?.listDir?.(dir)
      .then((e: DirEntry[]) => setFiles(e.filter(f => f.name.endsWith(".md"))))
      .catch(() => setFiles([]));
  }, [dir]);

  if (files === null) return <EmptyState msg="Loading…" />;

  if (selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)} style={{ marginBottom: 12, padding: "5px 12px", fontSize: "12px", background: "#e8eeff", border: "none", borderRadius: 6, cursor: "pointer", color: "#4a6cf7" }}>← Briefs</button>
        <div style={{ fontWeight: 700, marginBottom: 10, fontSize: "13px" }}>{selected.replace(".md", "")}</div>
        <div style={{ fontSize: "12px", whiteSpace: "pre-wrap", lineHeight: 1.7, color: "#333" }}>{content}</div>
      </div>
    );
  }

  if (files.length === 0) return <EmptyState msg="No briefs yet" />;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div style={PANEL}>
      <div style={{ fontSize: "11px", color: "#aaa", marginBottom: 4 }}>{files.length} briefs</div>
      {files.slice(0, 30).map(f => {
        const isToday = f.name.startsWith(today);
        return (
          <div key={f.name} onClick={() => {
            setSelected(f.name);
            window.electronAPI?.readFile(dir, f.name).then(r => setContent(r || "(empty)")).catch(() => setContent("(error)"));
          }} style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "10px 14px", backgroundColor: "#fff",
            borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", cursor: "pointer",
            borderLeft: isToday ? "3px solid #4a6cf7" : "3px solid transparent",
          }}>
            <span style={{ fontSize: "16px" }}>📄</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ fontWeight: 600, fontSize: "12px" }}>{f.name.replace(".md", "")}</div>
                {isToday && <Chip label="TODAY" color="#4a6cf7" bg="#eef0ff" />}
              </div>
              <div style={{ fontSize: "11px", color: "#aaa", marginTop: 2 }}>{formatBytes(f.size)} · {relativeTime(f.mtime)}</div>
            </div>
            <span style={{ color: "#ccc" }}>›</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Memory ────────────────────────────────────────────────────────────────────
function MemoryTab() {
  const [files, setFiles] = useState<DirEntry[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const dir = OC + "/workspace/memory";

  useEffect(() => {
    window.electronAPI?.listDir?.(dir)
      .then((e: DirEntry[]) => setFiles(e.filter(f => f.name.endsWith(".md") || f.name.endsWith(".json"))))
      .catch(() => setFiles([]));
  }, [dir]);

  if (files === null) return <EmptyState msg="Loading…" />;

  if (selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)} style={{ marginBottom: 12, padding: "5px 12px", fontSize: "12px", background: "#e8eeff", border: "none", borderRadius: 6, cursor: "pointer", color: "#4a6cf7" }}>← Memory</button>
        <div style={{ fontWeight: 700, marginBottom: 10, fontSize: "13px" }}>{selected}</div>
        <div style={{ fontSize: "12px", whiteSpace: "pre-wrap", lineHeight: 1.7, color: "#333", wordBreak: "break-word" }}>{content}</div>
      </div>
    );
  }

  if (files.length === 0) return <EmptyState msg="No memory files" />;

  return (
    <div style={PANEL}>
      <div style={{ fontSize: "11px", color: "#aaa", marginBottom: 4 }}>{files.length} files</div>
      {files.slice(0, 40).map(f => (
        <div key={f.name} onClick={() => {
          setSelected(f.name);
          window.electronAPI?.readFile(dir, f.name).then(r => setContent(r || "(empty)")).catch(() => setContent("(error)"));
        }} style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "9px 14px", backgroundColor: "#fff",
          borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", cursor: "pointer",
        }}>
          <span style={{ fontSize: "14px" }}>{f.name.endsWith(".json") ? "⚙️" : "📝"}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: "12px" }}>{f.name}</div>
            <div style={{ fontSize: "11px", color: "#aaa", marginTop: 2 }}>{formatBytes(f.size)} · {relativeTime(f.mtime)}</div>
          </div>
          <span style={{ color: "#ccc" }}>›</span>
        </div>
      ))}
    </div>
  );
}

// ── Skills ────────────────────────────────────────────────────────────────────
function SkillsTab() {
  const [skills, setSkills] = useState<DirEntry[] | null>(null);

  useEffect(() => {
    window.electronAPI?.listDir?.(OC + "/skills")
      .then((e: DirEntry[]) => setSkills(e.filter(f => !f.name.startsWith("."))))
      .catch(() => setSkills([]));
  }, []);

  if (skills === null) return <EmptyState msg="Loading…" />;
  if (skills.length === 0) return <EmptyState msg="No skills loaded" />;

  return (
    <div style={PANEL}>
      <div style={{ fontSize: "11px", color: "#aaa", marginBottom: 8 }}>{skills.length} skills in ~/.openclaw/skills/</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {skills.map(s => (
          <div key={s.name} style={{
            padding: "5px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 500,
            backgroundColor: "#eef0ff", color: "#4a6cf7",
            border: "1px solid #dde4ff",
          }}>
            {s.name}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Cron tab (summary view) ───────────────────────────────────────────────────
interface CronJob { id: string; name: string; enabled: boolean; schedule?: { expr?: string }; state?: { lastRunStatus?: string; lastRunAtMs?: number }; }

function CronTab() {
  const [jobs, setJobs] = useState<CronJob[] | null>(null);

  useEffect(() => {
    window.electronAPI?.readFile(OC + "/cron", "jobs.json")
      .then((raw) => { if (!raw) return setJobs([]); setJobs(JSON.parse(raw).jobs || []); })
      .catch(() => setJobs([]));
  }, []);

  if (jobs === null) return <EmptyState msg="Loading…" />;
  if (jobs.length === 0) return <EmptyState msg="No cron jobs" />;

  const ok = jobs.filter(j => j.enabled && j.state?.lastRunStatus === "ok").length;
  const err = jobs.filter(j => j.enabled && j.state?.lastRunStatus === "error").length;
  const dis = jobs.filter(j => !j.enabled).length;

  return (
    <div style={PANEL}>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: 8 }}>
        <Chip label={`${ok} healthy`} color="#27ae60" bg="#e8f8f0" />
        {err > 0 && <Chip label={`${err} failed`} color="#e74c3c" bg="#fdf0ef" />}
        <Chip label={`${dis} disabled`} color="#999" bg="#f5f5f5" />
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
              <div style={{ fontWeight: 600, fontSize: "12px" }}>{j.name}</div>
              <div style={{ fontSize: "11px", color: "#aaa", marginTop: 2 }}>
                {j.schedule?.expr || "—"}{j.state?.lastRunAtMs ? ` · ${relativeTime(j.state.lastRunAtMs)}` : ""}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main block ────────────────────────────────────────────────────────────────
export function BrainBlock({ block }: { block: Block }) {
  const [view, setView] = useBlockField(block.id, "view", "briefs", { global: true });
  const { open } = useFullscreenStore();

  const tabs = [
    { key: "briefs", label: "Briefs" },
    { key: "memory", label: "Memory" },
    { key: "skills", label: "Skills" },
    { key: "cron",   label: "Cron" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setView(t.key)} style={{
              padding: "5px 12px", fontSize: "12px",
              backgroundColor: view === t.key ? "#4a6cf7" : "#eef0ff",
              color: view === t.key ? "#fff" : "#4a6cf7",
              border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: view === t.key ? 600 : 400,
            }}>{t.label}</button>
          ))}
        </div>
        <button onClick={() => open("brain")} title="Fullscreen" style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 28, height: 28, borderRadius: "6px",
          background: "#eef0ff", border: "none", cursor: "pointer", color: "#4a6cf7", flexShrink: 0,
        }}>
          <Maximize2 size={13} />
        </button>
      </div>

      <div style={{ backgroundColor: "#f8f9ff", borderRadius: "10px", padding: "12px", minHeight: "160px" }}>
        {view === "briefs" && <BriefsTab />}
        {view === "memory" && <MemoryTab />}
        {view === "skills" && <SkillsTab />}
        {view === "cron"   && <CronTab />}
      </div>
    </div>
  );
}
