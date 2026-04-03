import { useTimerStore } from "../stores/useTimerStore";
import { pick } from "../utils/i18n";
import { useLang } from "../hooks/useLang";

interface TimerRingProps {
  size?: number;
  strokeWidth?: number;
}

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(Math.abs(totalSeconds) / 60);
  const secs = Math.abs(totalSeconds) % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function TimerRing({ size = 200, strokeWidth = 22 }: TimerRingProps) {
  useLang();
  const { timerState } = useTimerStore();
  const { remaining, duration, overtime, mode, running } = timerState;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const isOvertime = remaining <= 0 && overtime > 0;
  const isRest = mode === "break";

  // Progress offset: 0 = full ring, circumference = empty ring
  const progress = duration > 0 ? Math.max(0, remaining) / duration : 0;
  const offset = circumference * (1 - progress);

  // Color by state
  const strokeColor = isOvertime
    ? "var(--danger)"
    : isRest
      ? "var(--gold)"
      : running
        ? "var(--accent)"
        : "var(--text-tertiary)";

  const timeColor = isOvertime
    ? "var(--danger)"
    : isRest
      ? "var(--gold)"
      : running
        ? "var(--accent)"
        : "var(--text-secondary)";

  const displayTime = isOvertime ? formatTime(overtime) : formatTime(remaining);

  const statusLabel = running
    ? isOvertime
      ? pick("超時", "Overtime")
      : isRest
        ? pick("休息中", "Resting")
        : pick("專注中", "Focusing")
    : remaining <= 0
      ? pick("完成", "Done")
      : pick("就緒", "Ready");

  const modeLabel = isRest ? pick("休息", "Rest") : pick("專注", "Focus");

  const center = size / 2;

  return (
    <div className="timer-ring-container" style={{ width: size, height: size }}>
      <svg
        className="timer-ring-svg"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Track (background ring) */}
        <circle
          className="timer-ring-track"
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={strokeWidth}
        />

        {/* Progress arc */}
        <circle
          className={`timer-ring-progress ${running ? "running" : "idle"}`}
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={strokeColor}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />

        {/* Overtime pulse overlay */}
        {isOvertime && (
          <circle
            className="timer-ring-overtime"
            cx={center}
            cy={center}
            r={radius}
            strokeWidth={strokeWidth}
            stroke="var(--danger)"
            strokeDasharray={circumference}
            strokeDashoffset={0}
          />
        )}
      </svg>

      {/* Inner face */}
      <div className="timer-ring-face">
        <div className="timer-ring-mode-label">{modeLabel}</div>
        <div
          className="timer-ring-time"
          style={{ fontSize: "clamp(2rem, 4.5vw, 2.6rem)", color: timeColor }}
        >
          {isOvertime && <span style={{ fontSize: "1.2rem", marginRight: 2 }}>+</span>}
          {displayTime}
        </div>
        <div className="timer-ring-status">{statusLabel}</div>
        {isOvertime && (
          <div className="timer-ring-overtime-badge">
            +{formatTime(overtime)}
          </div>
        )}
      </div>
    </div>
  );
}
