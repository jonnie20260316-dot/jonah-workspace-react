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

function relativeTime(ms: number): string {
  const d = Date.now() - ms;
  const m = Math.floor(d / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function EmptyState({ msg, sub }: { msg: string; sub?: string }) {
  return (
    <div style={{ padding: "24px 0", textAlign: "center" }}>
      <div style={{ color: "#bbb", fontSize: "12px", fontStyle: "italic" }}>{msg}</div>
      {sub && <div style={{ color: "#ccc", fontSize: "10px", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

interface DirEntry { name: string; size: number; mtime: number; }

// ── Research ──────────────────────────────────────────────────────────────────
function ResearchTab() {
  const [files, setFiles] = useState<DirEntry[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const dir = OC + "/workspace/agents/trend-scout/workspace";

  useEffect(() => {
    window.electronAPI?.listDir?.(dir)
      .then((e: DirEntry[]) => setFiles(e.filter(f => f.name.endsWith(".md") && f.name.includes("talkable"))))
      .catch(() => setFiles([]));
  }, []);

  if (files === null) return <EmptyState msg="Loading…" />;

  if (selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)} style={{ marginBottom: 12, padding: "5px 12px", fontSize: "12px", background: "#e8f8f0", border: "none", borderRadius: 6, cursor: "pointer", color: "#27ae60" }}>← Research</button>
        <div style={{ fontWeight: 700, marginBottom: 10, fontSize: "13px" }}>{selected.replace(".md", "")}</div>
        <div style={{ fontSize: "12px", whiteSpace: "pre-wrap", lineHeight: 1.7, color: "#333" }}>{content}</div>
      </div>
    );
  }

  if (files.length === 0) return <EmptyState msg="No research files yet" sub="Trend scout runs each morning" />;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div style={PANEL}>
      <div style={{ fontSize: "11px", color: "#aaa", marginBottom: 4 }}>{files.length} reports</div>
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
            borderLeft: isToday ? "3px solid #27ae60" : "3px solid transparent",
          }}>
            <span style={{ fontSize: "16px" }}>📡</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ fontWeight: 600, fontSize: "12px" }}>{f.name.replace(".md", "")}</div>
                {isToday && <Chip label="TODAY" color="#27ae60" bg="#e8f8f0" />}
              </div>
              <div style={{ fontSize: "11px", color: "#aaa", marginTop: 2 }}>{relativeTime(f.mtime)}</div>
            </div>
            <span style={{ color: "#ccc" }}>›</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Ideas ─────────────────────────────────────────────────────────────────────
interface Idea { id?: string; title: string; notes?: string; date?: string; category?: string; }

function IdeasTab() {
  const [ideas, setIdeas] = useState<Idea[] | null>(null);

  useEffect(() => {
    window.electronAPI?.readFile(OC + "/workspace/data", "ideas.json")
      .then((raw) => { if (!raw) return setIdeas([]); setIdeas(JSON.parse(raw).ideas || []); })
      .catch(() => setIdeas([]));
  }, []);

  if (ideas === null) return <EmptyState msg="Loading…" />;

  if (ideas.length === 0) {
    return (
      <EmptyState
        msg="No ideas yet"
        sub="Add to ~/.openclaw/workspace/data/ideas.json"
      />
    );
  }

  return (
    <div style={PANEL}>
      <div style={{ fontSize: "11px", color: "#aaa", marginBottom: 4 }}>{ideas.length} ideas</div>
      {ideas.map((idea, i) => (
        <div key={idea.id || i} style={{
          padding: "10px 14px", backgroundColor: "#fff",
          borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}>
          <div style={{ fontWeight: 600, fontSize: "13px", color: "#111" }}>{idea.title}</div>
          {idea.notes && <div style={{ fontSize: "12px", color: "#666", marginTop: 4, lineHeight: 1.5 }}>{idea.notes}</div>}
          {(idea.date || idea.category) && (
            <div style={{ fontSize: "11px", color: "#aaa", marginTop: 5, display: "flex", gap: "8px" }}>
              {idea.category && <span style={{ padding: "1px 7px", borderRadius: "4px", background: "#f0fff4", color: "#27ae60" }}>{idea.category}</span>}
              {idea.date && <span>{idea.date}</span>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Builds ────────────────────────────────────────────────────────────────────
function BuildsTab() {
  const [files, setFiles] = useState<DirEntry[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const dir = OC + "/workspace/agents/orchestrator/workspace";

  useEffect(() => {
    window.electronAPI?.listDir?.(dir)
      .then((e: DirEntry[]) => setFiles(e.filter(f => f.name.endsWith(".md"))))
      .catch(() => setFiles([]));
  }, []);

  if (files === null) return <EmptyState msg="Loading…" />;

  if (selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)} style={{ marginBottom: 12, padding: "5px 12px", fontSize: "12px", background: "#e8f8f0", border: "none", borderRadius: 6, cursor: "pointer", color: "#27ae60" }}>← Builds</button>
        <div style={{ fontWeight: 700, marginBottom: 10, fontSize: "13px" }}>{selected.replace(".md", "")}</div>
        <div style={{ fontSize: "12px", whiteSpace: "pre-wrap", lineHeight: 1.7, color: "#333" }}>{content}</div>
      </div>
    );
  }

  if (files.length === 0) return <EmptyState msg="No build logs yet" />;

  return (
    <div style={PANEL}>
      <div style={{ fontSize: "11px", color: "#aaa", marginBottom: 4 }}>{files.length} logs</div>
      {files.slice(0, 30).map(f => (
        <div key={f.name} onClick={() => {
          setSelected(f.name);
          window.electronAPI?.readFile(dir, f.name).then(r => setContent(r || "(empty)")).catch(() => setContent("(error)"));
        }} style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "9px 14px", backgroundColor: "#fff",
          borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", cursor: "pointer",
        }}>
          <span style={{ fontSize: "14px" }}>🔧</span>
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

// ── Main block ────────────────────────────────────────────────────────────────
export function LabBlock({ block }: { block: Block }) {
  const [view, setView] = useBlockField(block.id, "view", "research", { global: true });
  const { open } = useFullscreenStore();

  const tabs = [
    { key: "research", label: "Research" },
    { key: "ideas",    label: "Ideas" },
    { key: "builds",   label: "Builds" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setView(t.key)} style={{
              padding: "5px 12px", fontSize: "12px",
              backgroundColor: view === t.key ? "#27ae60" : "#e8f8f0",
              color: view === t.key ? "#fff" : "#27ae60",
              border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: view === t.key ? 600 : 400,
            }}>{t.label}</button>
          ))}
        </div>
        <button onClick={() => open("lab")} title="Fullscreen" style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 28, height: 28, borderRadius: "6px",
          background: "#e8f8f0", border: "none", cursor: "pointer", color: "#27ae60", flexShrink: 0,
        }}>
          <Maximize2 size={13} />
        </button>
      </div>

      <div style={{ backgroundColor: "#f8fff9", borderRadius: "10px", padding: "12px", minHeight: "160px" }}>
        {view === "research" && <ResearchTab />}
        {view === "ideas"    && <IdeasTab />}
        {view === "builds"   && <BuildsTab />}
      </div>
    </div>
  );
}
