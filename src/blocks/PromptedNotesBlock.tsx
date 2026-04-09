import { useState, useEffect } from "react";
import type { Block } from "../types";
import { useModalStore } from "../stores/useModalStore";
import { loadJSON } from "../utils/storage";
import { useLang } from "../hooks/useLang";
import { pick } from "../utils/i18n";

interface PromptField {
  id: string;
  label: string;
  placeholder?: string;
  type: "text" | "textarea";
}

interface PromptedEntry {
  id: string;
  blockId: string;
  date: string;
  timestamp: number;
  fields: Record<string, string>;
}

interface PromptedNotesBlockProps {
  block: Block;
}

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Prompted Notes block - custom prompt templates with structured entries.
 * Fields: prompted-notes-config:{blockId}, prompted-notes-entries:{blockId}
 */
export function PromptedNotesBlock({ block }: PromptedNotesBlockProps) {
  useLang();
  const { openPnModal, pnModal } = useModalStore();
  const [config, setConfig] = useState<PromptField[]>(() =>
    loadJSON(`prompted-notes-config:${block.id}`, [])
  );
  const [entries, setEntries] = useState<PromptedEntry[]>(() =>
    loadJSON(`prompted-notes-entries:${block.id}`, [])
  );

  // Refresh when PN modal closes
  useEffect(() => {
    if (!pnModal.open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync read from localStorage, not async
      setConfig(loadJSON(`prompted-notes-config:${block.id}`, []));
      setEntries(loadJSON(`prompted-notes-entries:${block.id}`, []));
    }
  }, [pnModal.open, block.id]);

  const hasConfig = config.length > 0;
  const today = todayString();
  const todayEntries = entries.filter((e) => e.date === today);
  const historyEntries = entries
    .filter((e) => e.date !== today)
    .sort((a, b) => b.timestamp - a.timestamp);

  const entryPreview = (entry: PromptedEntry) => {
    const values = Object.values(entry.fields || {}).filter(Boolean);
    return values.join(" / ").slice(0, 60) || "(empty)";
  };

  if (!hasConfig) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          padding: "40px 20px",
          textAlign: "center",
          minHeight: "200px",
        }}
      >
        <div style={{ opacity: 0.45, fontSize: "calc(13px * var(--text-scale))" }}>
          {pick("尚未設定提示。", "No prompts configured yet.")}
        </div>
        <button
          onClick={() => openPnModal(block.id, "config")}
          style={{
            padding: "8px 16px",
            fontSize: "calc(12px * var(--text-scale))",
            backgroundColor: "#333",
            color: "#fff",
            border: "none",
            borderRadius: "2px",
            cursor: "pointer",
          }}
        >
          {pick("設定提示", "Configure Prompts")}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Top toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px",
          backgroundColor: "#f5f5f5",
          borderRadius: "4px",
        }}
      >
        <button
          onClick={() => openPnModal(block.id, "entry")}
          style={{
            padding: "6px 12px",
            fontSize: "calc(12px * var(--text-scale))",
            backgroundColor: "#333",
            color: "#fff",
            border: "none",
            borderRadius: "2px",
            cursor: "pointer",
          }}
        >
          {pick("＋新記錄", "+ New Entry")}
        </button>
        <button
          onClick={() => openPnModal(block.id, "config")}
          style={{
            marginLeft: "auto",
            padding: "6px 12px",
            fontSize: "calc(12px * var(--text-scale))",
            backgroundColor: "#ddd",
            border: "none",
            borderRadius: "2px",
            cursor: "pointer",
          }}
        >
          {pick("設定", "Config")}
        </button>
      </div>

      {/* Today's entries */}
      {todayEntries.length > 0 && (
        <div>
          <div style={{ fontSize: "calc(11px * var(--text-scale))", color: "#999", marginBottom: "6px" }}>
            Today ({todayEntries.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {todayEntries.map((entry) => (
              <div
                key={entry.id}
                onClick={() => openPnModal(block.id, "entry", entry.id)}
                style={{
                  padding: "8px",
                  backgroundColor: "#f0f7ff",
                  borderRadius: "2px",
                  cursor: "pointer",
                  fontSize: "calc(12px * var(--text-scale))",
                }}
              >
                <div style={{ fontSize: "calc(11px * var(--text-scale))", color: "#666", marginBottom: "2px" }}>
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </div>
                <div style={{ color: "#333" }}>{entryPreview(entry)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History entries */}
      {historyEntries.length > 0 && (
        <div>
          <div style={{ fontSize: "calc(11px * var(--text-scale))", color: "#999", marginBottom: "6px" }}>
            History ({historyEntries.length})
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              maxHeight: "200px",
              overflowY: "auto",
            }}
          >
            {historyEntries.slice(0, 20).map((entry) => (
              <div
                key={entry.id}
                onClick={() => openPnModal(block.id, "entry", entry.id)}
                style={{
                  padding: "8px",
                  backgroundColor: "#f9f9f9",
                  borderRadius: "2px",
                  cursor: "pointer",
                  fontSize: "calc(12px * var(--text-scale))",
                }}
              >
                <div style={{ fontWeight: "500", marginBottom: "2px" }}>
                  {entry.date}
                </div>
                <div style={{ fontSize: "calc(11px * var(--text-scale))", color: "#666" }}>
                  {entryPreview(entry)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {entries.length === 0 && (
        <div
          style={{
            padding: "20px",
            backgroundColor: "#f5f5f5",
            borderRadius: "4px",
            fontSize: "calc(12px * var(--text-scale))",
            color: "#999",
            textAlign: "center",
          }}
        >
          {pick("還沒有記錄，點擊「＋新記錄」開始。", 'No entries yet. Click "+ New Entry" to start.')}
        </div>
      )}
    </div>
  );
}
