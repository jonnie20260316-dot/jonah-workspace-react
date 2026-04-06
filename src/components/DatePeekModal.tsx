import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ArrowRight } from "lucide-react";
import { useBlockStore } from "../stores/useBlockStore";
import { loadFieldForDate } from "../utils/storage";
import { pick } from "../utils/i18n";
import { useLang } from "../hooks/useLang";

interface DatePeekModalProps {
  date: string; // YYYY-MM-DD
  onClose: () => void;
  onNavigate: () => void; // jump to that date
}

const DAY_NAMES_ZH = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];
const MONTH_NAMES_ZH = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"];

function formatFullDate(dateStr: string, lang: "zh" | "en"): string {
  const d = new Date(dateStr + "T00:00:00");
  if (lang === "zh") {
    return `${d.getFullYear()} 年 ${MONTH_NAMES_ZH[d.getMonth()]} 月 ${d.getDate()} 日  ${DAY_NAMES_ZH[d.getDay()]}`;
  }
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type TabKey = "journal" | "kit" | "intention" | "tasks";
const TABS: Array<{ key: TabKey; zh: string; en: string }> = [
  { key: "journal", zh: "日記", en: "Journal" },
  { key: "kit", zh: "KIT", en: "KIT" },
  { key: "intention", zh: "意向", en: "Intention" },
  { key: "tasks", zh: "任務", en: "Tasks" },
];

function EmptyNote() {
  return (
    <div style={{ color: "var(--text-tertiary)", fontSize: 12, fontStyle: "italic", padding: "8px 0" }}>
      {pick("（當天沒有記錄）", "(No entry for this day)")}
    </div>
  );
}

function PeekSection({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontSize: 10,
        fontWeight: 700,
        color: "var(--text-tertiary)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 13,
        color: "var(--ink)",
        lineHeight: 1.65,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}>
        {value}
      </div>
    </div>
  );
}

const TASK_DEFAULT_LABELS = ["Journal", "KIT", "Main push", "Client / Offer", "System / AI", "Study / Stretch"];

export function DatePeekModal({ date, onClose, onNavigate }: DatePeekModalProps) {
  const lang = useLang();
  const { blocks } = useBlockStore();
  const [activeTab, setActiveTab] = useState<TabKey>("journal");
  const panelRef = useRef<HTMLDivElement>(null);

  const journalBlock = blocks.find((b) => b.type === "journal");
  const kitBlock = blocks.find((b) => b.type === "kit");
  const intentionBlock = blocks.find((b) => b.type === "intention");
  const tasksBlock = blocks.find((b) => b.type === "tasks");

  const f = (blockId: string | undefined, key: string) =>
    blockId ? loadFieldForDate(date, blockId, key) : "";

  // Journal fields
  const journalMood = f(journalBlock?.id, "mood");
  const journalSnapshot = f(journalBlock?.id, "snapshot");
  const journalSmallWins = f(journalBlock?.id, "small-wins");
  const journalBigWins = f(journalBlock?.id, "big-wins");
  const journalBody = f(journalBlock?.id, "body");
  const journalHasAny = [journalMood, journalSnapshot, journalSmallWins, journalBigWins, journalBody].some((v) => v.trim());

  // KIT fields
  const kitKeep = f(kitBlock?.id, "keep");
  const kitImprove = f(kitBlock?.id, "improve");
  const kitTry = f(kitBlock?.id, "try");
  const kitGrowth = f(kitBlock?.id, "growth");
  const kitHasAny = [kitKeep, kitImprove, kitTry, kitGrowth].some((v) => v.trim());

  // Intention fields
  const intentionGoal = f(intentionBlock?.id, "goal");
  const intentionNext = f(intentionBlock?.id, "next");
  const intentionTheme = f(intentionBlock?.id, "theme");
  const intentionHasAny = [intentionGoal, intentionNext, intentionTheme].some((v) => v.trim());

  // Tasks (6 fixed task slots)
  const taskItems = TASK_DEFAULT_LABELS.map((defaultLabel, i) => ({
    title: f(tasksBlock?.id, `task:${i}:title`) || defaultLabel,
    done: f(tasksBlock?.id, `task:${i}:done`),
  }));

  const tabHasContent: Record<TabKey, boolean> = {
    journal: journalHasAny,
    kit: kitHasAny,
    intention: intentionHasAny,
    tasks: taskItems.some((t) => t.done === "true" || t.done === "1"),
  };

  // Close on Escape or outside click
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const modal = (
    <>
      {/* Backdrop */}
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
        {/* Panel */}
        <div
          ref={panelRef}
          className="date-peek-modal"
          style={{
            width: "min(440px, 100%)",
            maxHeight: "min(72vh, 680px)",
            background: "rgba(251, 248, 242, 0.98)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            borderRadius: 16,
            boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
            border: "1px solid var(--line)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
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
              {formatFullDate(date, lang)}
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

          {/* Tabs */}
          <div style={{
            display: "flex",
            gap: 0,
            padding: "8px 16px 0",
            flexShrink: 0,
            borderBottom: "1px solid var(--line)",
          }}>
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "5px 12px",
                  fontSize: 12,
                  fontWeight: 500,
                  border: "none",
                  cursor: "pointer",
                  borderRadius: "var(--radius-sm) var(--radius-sm) 0 0",
                  background: "none",
                  color: activeTab === tab.key ? "var(--ink)" : "var(--text-tertiary)",
                  borderBottom: activeTab === tab.key ? "2px solid var(--accent)" : "2px solid transparent",
                  marginBottom: -1,
                  transition: "color var(--dur-fast)",
                  position: "relative",
                }}
              >
                {lang === "zh" ? tab.zh : tab.en}
                {tabHasContent[tab.key] && (
                  <span style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "var(--accent)",
                  }} />
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "14px 16px",
          }}>
            {activeTab === "journal" && (
              journalHasAny ? (
                <>
                  {journalMood && (
                    <div style={{ fontSize: 22, marginBottom: 8 }}>{journalMood}</div>
                  )}
                  <PeekSection label={pick("快照", "Snapshot")} value={journalSnapshot} />
                  <PeekSection label={pick("小勝利", "Small wins")} value={journalSmallWins} />
                  <PeekSection label={pick("大勝利", "Big wins")} value={journalBigWins} />
                  <PeekSection label={pick("日記", "Journal")} value={journalBody} />
                </>
              ) : <EmptyNote />
            )}

            {activeTab === "kit" && (
              kitHasAny ? (
                <>
                  <PeekSection label="Keep" value={kitKeep} />
                  <PeekSection label="Improve" value={kitImprove} />
                  <PeekSection label="Try" value={kitTry} />
                  <PeekSection label={pick("成長筆記", "Growth")} value={kitGrowth} />
                </>
              ) : <EmptyNote />
            )}

            {activeTab === "intention" && (
              intentionHasAny ? (
                <>
                  <PeekSection label={pick("今日目標", "Goal")} value={intentionGoal} />
                  <PeekSection label={pick("下一步", "Next")} value={intentionNext} />
                  <PeekSection label={pick("主題詞", "Theme")} value={intentionTheme} />
                </>
              ) : <EmptyNote />
            )}

            {activeTab === "tasks" && (
              tasksBlock ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {taskItems.map((task, i) => {
                    const isDone = task.done === "true" || task.done === "1";
                    return (
                      <div key={i} style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 8px",
                        borderRadius: "var(--radius-sm)",
                        background: "rgba(36,50,49,0.03)",
                        opacity: isDone ? 0.55 : 1,
                      }}>
                        <span style={{
                          width: 14,
                          height: 14,
                          borderRadius: 3,
                          border: isDone ? "1.5px solid var(--accent)" : "1.5px solid var(--line)",
                          background: isDone ? "var(--accent)" : "transparent",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 9,
                          color: "#fff",
                        }}>
                          {isDone ? "✓" : ""}
                        </span>
                        <span style={{
                          fontSize: 12,
                          color: "var(--ink)",
                          textDecoration: isDone ? "line-through" : "none",
                        }}>
                          {task.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : <EmptyNote />
            )}
          </div>

          {/* Footer */}
          <div style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 8,
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
              {pick("關閉", "Close")}
            </button>
            <button
              onClick={onNavigate}
              style={{
                padding: "6px 14px",
                fontSize: 12,
                border: "none",
                borderRadius: "var(--radius-sm)",
                background: "var(--ink)",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.85"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
            >
              {pick("查看當天", "Go to this day")}
              <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modal, document.body);
}
