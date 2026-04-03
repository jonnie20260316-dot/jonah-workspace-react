import { useTimerStore } from "../stores/useTimerStore";

export interface TimerStats {
  totalMin: number;
  count: number;
  average: number;
  targetMin: number;
}

/**
 * Computes daily focus stats from timer sessions.
 * Only counts "work" mode sessions (rest doesn't count toward daily goal).
 */
export function useTimerStats(): TimerStats {
  const sessions = useTimerStore((s) => s.sessions);
  const targetMin = useTimerStore((s) => s.timerSettings.dailyTarget);

  const workSessions = sessions.filter((s) => s.mode === "work");
  const totalSec = workSessions.reduce((acc, s) => acc + s.actual + s.overtime, 0);
  const totalMin = Math.round(totalSec / 60);
  const count = workSessions.length;
  const average = count > 0 ? Math.round(totalMin / count) : 0;

  return { totalMin, count, average, targetMin };
}
