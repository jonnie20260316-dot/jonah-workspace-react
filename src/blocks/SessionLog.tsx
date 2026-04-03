import { useState } from "react";
import { ChevronDown, Check, Pencil, Trash2 } from "lucide-react";
import { useTimerStore } from "../stores/useTimerStore";
import { pick } from "../utils/i18n";
import { useLang } from "../hooks/useLang";
import type { TimerSession } from "../types";

interface SessionLogItemProps {
  session: TimerSession;
  date: string;
}

function formatMinSec(seconds: number): string {
  const m = Math.floor(Math.abs(seconds) / 60);
  const s = Math.abs(seconds) % 60;
  return `${m}m${s > 0 ? ` ${s}s` : ""}`;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return "--:--";
  }
}

// JW-29: Extract to named component — no hooks in .map()
function SessionLogItem({ session, date }: SessionLogItemProps) {
  const { updateSession, deleteSession } = useTimerStore();
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(session.task || pick("無標題", "Untitled"));

  const handleEdit = () => {
    if (editing) {
      updateSession(session.id, date, { task: editValue });
      setEditing(false);
    } else {
      setEditValue(session.task || pick("無標題", "Untitled"));
      setEditing(true);
    }
  };

  const handleDelete = () => {
    const confirmed = window.confirm(
      pick(`刪除「${session.task || "無標題"}」？`, `Delete "${session.task || "Untitled"}"?`)
    );
    if (confirmed) deleteSession(session.id, date);
  };

  return (
    <div className="timer-session-row">
      <span className="ts-check"><Check size={12} /></span>
      <span className="ts-task">
        {editing ? (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleEdit()}
            autoFocus
            style={{ fontSize: 11, width: "100%", border: "1px solid var(--accent)", borderRadius: 3, padding: "1px 4px", background: "var(--surface-0)", color: "var(--ink)" }}
          />
        ) : (
          session.task || pick("無標題", "Untitled")
        )}
      </span>
      <span className="ts-dur">{formatMinSec(session.actual)}</span>
      {session.overtime > 0 && (
        <span className="ts-ot">+{formatMinSec(session.overtime)}</span>
      )}
      <span className="ts-time">{formatTime(session.endedAt)}</span>
      <span style={{ display: "flex", gap: 2 }}>
        <button className="ts-edit" onClick={handleEdit} title={pick(editing ? "儲存" : "編輯", editing ? "Save" : "Edit")}>
          <Pencil size={11} />
        </button>
        <button className="ts-edit" onClick={handleDelete} title={pick("刪除", "Delete")}>
          <Trash2 size={11} />
        </button>
      </span>
    </div>
  );
}

interface SessionLogProps {
  date: string;
}

export function SessionLog({ date }: SessionLogProps) {
  useLang();
  const sessions = useTimerStore((s) => s.sessions);
  const [open, setOpen] = useState(false);

  const workSessions = sessions.filter((s) => s.mode === "work");
  const restSessions = sessions.filter((s) => s.mode === "break");

  return (
    <div>
      <button
        className="timer-log-toggle"
        onClick={() => setOpen((v) => !v)}
      >
        <span style={{ flex: 1, textAlign: "left" }}>
          {pick("工作階段", "Sessions")} ({workSessions.length})
        </span>
        <ChevronDown
          size={12}
          className={`timer-log-toggle-chevron ${open ? "open" : ""}`}
        />
      </button>

      <div className={`timer-session-log ${open ? "open" : ""}`}>
        {workSessions.length === 0 && (
          <div className="timer-log-rest-note">
            {pick("今日尚無紀錄", "No sessions yet today")}
          </div>
        )}
        {workSessions.map((s) => (
          <SessionLogItem key={s.id} session={s} date={date} />
        ))}
        {restSessions.length > 0 && (
          <div className="timer-log-rest-note">
            {pick("休息不計入每日目標", "Rest sessions don't count toward daily goal")}
          </div>
        )}
      </div>
    </div>
  );
}
