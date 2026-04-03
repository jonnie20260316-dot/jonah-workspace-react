import { useState, useRef } from "react";
import { useSessionStore } from "../stores/useSessionStore";
import { pick } from "../utils/i18n";
import { useLang } from "../hooks/useLang";
import { CalendarModal } from "./CalendarModal";

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function offsetString(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const ZH_DAYS = ["日", "一", "二", "三", "四", "五", "六"];
const EN_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function smartDateLabel(dateStr: string): string {
  const today = todayString();
  const yesterday = offsetString(-1);
  const tomorrow = offsetString(1);
  if (dateStr === today) return pick("今天", "Today");
  if (dateStr === yesterday) return pick("昨天", "Yesterday");
  if (dateStr === tomorrow) return pick("明天", "Tomorrow");
  const d = new Date(dateStr + "T00:00:00");
  const dow = pick(ZH_DAYS[d.getDay()], EN_DAYS[d.getDay()]);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return pick(`${dow} ${mm}.${dd}`, `${dow}. ${mm}.${dd}`);
}

export function DateNav() {
  useLang();
  const { activeDate, navigateDate, setActiveDate } = useSessionStore();
  const [calOpen, setCalOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const dateBtnRef = useRef<HTMLButtonElement>(null);
  const isToday = activeDate === todayString();

  const handleCalToggle = () => {
    if (!calOpen && dateBtnRef.current) {
      setAnchorRect(dateBtnRef.current.getBoundingClientRect());
    }
    setCalOpen((v) => !v);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <button
        onClick={() => navigateDate(-1)}
        style={arrowBtn}
        title={pick("上一天", "Previous day")}
      >
        ‹
      </button>

      <button
        ref={dateBtnRef}
        onClick={handleCalToggle}
        style={{
          ...dateBtn,
          fontWeight: isToday ? 700 : 400,
          color: isToday ? "var(--ink)" : "var(--text-secondary)",
        }}
        title={pick("選擇日期", "Pick a date")}
      >
        {smartDateLabel(activeDate)}
      </button>

      <button
        onClick={() => navigateDate(1)}
        style={arrowBtn}
        title={pick("下一天", "Next day")}
      >
        ›
      </button>

      {calOpen && anchorRect && (
        <CalendarModal
          currentDate={activeDate}
          anchorRect={anchorRect}
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
