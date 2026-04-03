import { useTimerStats } from "../hooks/useTimerStats";
import { useTimerStore } from "../stores/useTimerStore";
import { pick } from "../utils/i18n";
import { useLang } from "../hooks/useLang";

export function DailyFocusStats() {
  useLang();
  const { totalMin, count, average, targetMin } = useTimerStats();
  const { timerSettings, setTimerSettings } = useTimerStore();

  const pct = targetMin > 0 ? Math.min(100, (totalMin / targetMin) * 100) : 0;
  const exceeded = totalMin >= targetMin && targetMin > 0;

  const handleTargetClick = () => {
    const input = window.prompt(
      pick("每日目標（分鐘）:", "Daily target (minutes):"),
      String(timerSettings.dailyTarget)
    );
    if (input === null) return;
    const val = parseInt(input, 10);
    if (!isNaN(val) && val >= 0) {
      setTimerSettings({ ...useTimerStore.getState().timerSettings, dailyTarget: val });
    }
  };

  return (
    <div className="timer-daily-progress">
      <div className="timer-daily-header">
        <span className="timer-daily-title">
          {pick("每日專注", "Daily Focus")}
        </span>
        <span
          className="timer-daily-counts"
          onClick={handleTargetClick}
          title={pick("點擊修改目標", "Click to edit target")}
        >
          {totalMin} / {targetMin} {pick("分", "min")}
        </span>
      </div>

      <div className="timer-progress-track">
        <div
          className={`timer-progress-fill ${exceeded ? "exceeded" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="timer-stats-row">
        <div className="timer-stat-card">
          <div className={`timer-stat-value ${exceeded ? "exceeded" : ""}`}>
            {String(totalMin).padStart(2, "0")}
          </div>
          <div className="timer-stat-label">{pick("分鐘", "Minutes")}</div>
        </div>
        <div className="timer-stat-card">
          <div className="timer-stat-value">
            {String(count).padStart(2, "0")}
          </div>
          <div className="timer-stat-label">{pick("工作階段", "Sessions")}</div>
        </div>
        <div className="timer-stat-card">
          <div className="timer-stat-value">
            {String(average).padStart(2, "0")}
          </div>
          <div className="timer-stat-label">{pick("平均", "Average")}</div>
        </div>
      </div>
    </div>
  );
}
