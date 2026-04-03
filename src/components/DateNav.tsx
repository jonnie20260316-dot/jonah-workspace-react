import { useState } from "react";
import { useSessionStore } from "../stores/useSessionStore";
import { pick } from "../utils/i18n";
import { useLang } from "../hooks/useLang";
import { CalendarModal } from "./CalendarModal";

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function DateNav() {
  useLang();
  const { activeDate, navigateDate, setActiveDate } = useSessionStore();
  const [calOpen, setCalOpen] = useState(false);
  const isToday = activeDate === todayString();

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 6 }}>
      <button
        onClick={() => navigateDate(-1)}
        style={arrowBtn}
        title={pick("上一天", "Previous day")}
      >
        ‹
      </button>

      <button
        onClick={() => setCalOpen((v) => !v)}
        style={{
          ...dateBtn,
          fontWeight: isToday ? 700 : 400,
          color: isToday ? "var(--ink)" : "var(--text-secondary)",
        }}
        title={pick("選擇日期", "Pick a date")}
      >
        {activeDate}
      </button>

      <button
        onClick={() => navigateDate(1)}
        style={arrowBtn}
        title={pick("下一天", "Next day")}
      >
        ›
      </button>

      {calOpen && (
        <CalendarModal
          currentDate={activeDate}
          onSelectDate={(date) => {
            setActiveDate(date);
            setCalOpen(false);
          }}
          onClose={() => setCalOpen(false)}
        />
      )}
    </div>
  );
}

const arrowBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: 20,
  lineHeight: 1,
  padding: "0 4px",
  color: "var(--text-secondary)",
  borderRadius: 4,
  transition: "background 0.15s",
};

const dateBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: 13,
  fontFamily: "inherit",
  padding: "2px 6px",
  borderRadius: 4,
  transition: "background 0.15s",
  letterSpacing: "0.02em",
};
