import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { pick } from "../utils/i18n";
import { useLang } from "../hooks/useLang";

interface CalendarModalProps {
  currentDate: string;      // YYYY-MM-DD
  anchorRect: DOMRect;
  onSelectDate: (date: string) => void;
  onClose: () => void;
}

interface CalCell {
  date: string;     // YYYY-MM-DD
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildGrid(year: number, month: number, selected: string): CalCell[] {
  const today = todayStr();
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: CalCell[] = [];

  // Prev month padding
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const m = month - 1 < 0 ? 11 : month - 1;
    const y = month - 1 < 0 ? year - 1 : year;
    const date = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ date, day, isCurrentMonth: false, isToday: date === today, isSelected: date === selected });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ date, day: d, isCurrentMonth: true, isToday: date === today, isSelected: date === selected });
  }

  // Next month padding to fill 42 cells (6 rows × 7)
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const m = month + 1 > 11 ? 0 : month + 1;
    const y = month + 1 > 11 ? year + 1 : year;
    const date = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ date, day: d, isCurrentMonth: false, isToday: date === today, isSelected: date === selected });
  }

  return cells;
}

const ZH_MONTHS = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
const EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ZH_DOW = ["日", "一", "二", "三", "四", "五", "六"];
const EN_DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function CalendarModal({ currentDate, anchorRect, onSelectDate, onClose }: CalendarModalProps) {
  useLang();
  const ref = useRef<HTMLDivElement>(null);

  const initialDate = currentDate || todayStr();
  const [viewYear, setViewYear] = useState(() => parseInt(initialDate.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(() => parseInt(initialDate.slice(5, 7)) - 1);

  const cells = buildGrid(viewYear, viewMonth, currentDate);
  const dowLabels = pick(ZH_DOW.join(","), EN_DOW.join(",")).split(",");
  const monthLabel = pick(`${viewYear}年 ${ZH_MONTHS[viewMonth]}`, `${EN_MONTHS[viewMonth]} ${viewYear}`);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };

  // Close on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Compute fixed position from anchor rect, clamped to viewport
  const POPUP_WIDTH = 260;
  const rawLeft = anchorRect.left + anchorRect.width / 2 - POPUP_WIDTH / 2;
  const clampedLeft = Math.max(8, Math.min(rawLeft, window.innerWidth - POPUP_WIDTH - 8));

  return createPortal(
    <div
      className="cal-popup"
      ref={ref}
      style={{ position: "fixed", top: anchorRect.bottom + 8, left: clampedLeft }}
    >
      <div className="cal-header">
        <button className="cal-nav" onClick={prevMonth}>
          <ChevronLeft size={14} />
        </button>
        <span className="cal-month">{monthLabel}</span>
        <button className="cal-nav" onClick={nextMonth}>
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="cal-grid">
        {dowLabels.map((d) => (
          <div key={d} className="cal-day-name">{d}</div>
        ))}
        {cells.map((cell) => (
          <button
            key={cell.date}
            className={[
              "cal-day",
              !cell.isCurrentMonth ? "other-month" : "",
              cell.isToday ? "cal-today" : "",
              cell.isSelected ? "cal-active" : "",
            ].filter(Boolean).join(" ")}
            onClick={() => {
              onSelectDate(cell.date);
              onClose();
            }}
          >
            {cell.day}
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
}
