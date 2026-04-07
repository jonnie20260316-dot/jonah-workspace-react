import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useBlockStore } from "../stores/useBlockStore";
import { pick } from "../utils/i18n";
import { useLang } from "../hooks/useLang";
import { STORAGE_PREFIX } from "../constants";

const DAY_NAMES_ZH = ["\u9031\u65e5", "\u9031\u4e00", "\u9031\u4e8c", "\u9031\u4e09", "\u9031\u56db", "\u9031\u4e94", "\u9031\u516d"];

interface StickyHistoryEntry {
  date: string;
  blockId: string;
  body: string;
  label: string;
}

function scanStickyHistory(blocks: Array<{ id: string; label?: string; type: string }>): StickyHistoryEntry[] {
  const results: StickyHistoryEntry[] = [];
  const prefix = STORAGE_PREFIX + "session:";
  const blockLabels = new Map(blocks.filter((b) => b.type === "sticky").map((b) => [b.id, b.label ?? ""]));

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(prefix)) continue;
    const rest = key.slice(prefix.length);
    const match = rest.match(/^(\d{4}-\d{2}-\d{2}):(sticky-[^:]+):body$/);
    if (!match) continue;
    const value = localStorage.getItem(key);
    if (!value || !value.trim() || value === "<br>") continue;
    results.push({
      date: match[1],
      blockId: match[2],
      body: value,
      label: blockLabels.get(match[2]) ?? "",
    });
  }
  return results.sort((a, b) => b.date.localeCompare(a.date));
}

function formatDate(dateStr: string, lang: "zh" | "en"): string {
  const d = new Date(dateStr + "T00:00:00");
  if (lang === "zh") {
    return `${d.getMonth() + 1}\u6708${d.getDate()}\u65e5 (${DAY_NAMES_ZH[d.getDay()]})`;
  }
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function stripHtml(html: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent ?? "";
}

interface Props {
  onClose: () => void;
  onPeekDate?: (date: string) => void;
}

export function StickyHistoryPanel({ onClose, onPeekDate }: Props) {
  const lang = useLang();
  const { blocks } = useBlockStore();
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const entries = useMemo(() => scanStickyHistory(blocks), [blocks]);

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, StickyHistoryEntry[]>();
    for (const entry of entries) {
      const existing = map.get(entry.date) ?? [];
      existing.push(entry);
      map.set(entry.date, existing);
    }
    return Array.from(map.entries());
  }, [entries]);

  const modal = (
    <>
      <div
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 220,
          background: "rgba(36,50,49,0.18)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
          display: "grid",
          placeItems: "center",
          padding: 16,
        }}
      >
        <div style={{
          width: "min(520px, 100%)",
          maxHeight: "min(78vh, 720px)",
          background: "rgba(251, 248, 242, 0.98)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
          border: "1px solid var(--line)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px 12px",
            borderBottom: "1px solid var(--line)",
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
              {pick("\u4fbf\u5229\u8cbc\u6b77\u7a0b", "Sticky Note History")}
            </span>
            <button
              onClick={onClose}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 28, height: 28, border: "none", background: "none",
                cursor: "pointer", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(36,50,49,0.07)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
            {grouped.length === 0 && (
              <div style={{ color: "var(--text-tertiary)", fontSize: 12, fontStyle: "italic", padding: "8px 0" }}>
                {pick("\u6c92\u6709\u4fbf\u5229\u8cbc\u7d00\u9304", "No sticky note history")}
              </div>
            )}
            {grouped.map(([date, items]) => {
              const isExpanded = expandedDate === date;
              return (
                <div key={date} style={{ marginBottom: 12 }}>
                  <button
                    onClick={() => setExpandedDate(isExpanded ? null : date)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      padding: "6px 4px",
                      borderRadius: "var(--radius-sm)",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--ink)",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(36,50,49,0.04)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
                  >
                    <span>{formatDate(date, lang)}</span>
                    <span style={{ fontSize: 10, color: "var(--text-tertiary)", fontWeight: 400 }}>
                      {items.length} {pick("\u7b46", "note" + (items.length > 1 ? "s" : ""))}
                    </span>
                  </button>

                  {/* Preview: first line of each note */}
                  {!isExpanded && items.map((item) => (
                    <div key={item.blockId} style={{
                      padding: "3px 8px",
                      fontSize: 11,
                      color: "var(--text-secondary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {item.label ? <strong>{item.label}: </strong> : null}
                      {stripHtml(item.body).slice(0, 60)}
                    </div>
                  ))}

                  {/* Expanded: full content */}
                  {isExpanded && items.map((item) => (
                    <div key={item.blockId} style={{
                      padding: "8px 10px",
                      margin: "4px 0",
                      borderRadius: "var(--radius-sm)",
                      background: "rgba(36,50,49,0.03)",
                      border: "1px solid var(--line)",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        {item.label && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ink)" }}>
                            {item.label}
                          </span>
                        )}
                        <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                          {date}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--ink)",
                          lineHeight: 1.65,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                        dangerouslySetInnerHTML={{ __html: item.body }}
                      />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{
            display: "flex",
            justifyContent: "flex-end",
            padding: "10px 16px",
            borderTop: "1px solid var(--line)",
            flexShrink: 0,
          }}>
            <button
              onClick={onClose}
              style={{
                padding: "6px 14px",
                fontSize: 12,
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-sm)",
                background: "none",
                cursor: "pointer",
                color: "var(--text-secondary)",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(36,50,49,0.05)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              {pick("\u95dc\u9589", "Close")}
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modal, document.body);
}
