import { useEffect, useRef } from "react";
import { useTimerStore } from "../stores/useTimerStore";

/**
 * Global timer tick hook — call once in App.tsx.
 * Decrements remaining by 1/sec when running.
 * When remaining hits 0, increments overtime.
 * Persists to localStorage every 30 ticks and on stop.
 * Auto-logs session when overtime cap (120 min) is hit.
 */
export function useTimerTick() {
  const running = useTimerStore((s) => s.timerState.running);
  const tickRef = useRef(0);
  const sessionStartRef = useRef<string | null>(null);

  useEffect(() => {
    if (running) {
      if (!sessionStartRef.current) {
        sessionStartRef.current = new Date().toISOString();
      }
    }
  }, [running]);

  useEffect(() => {
    if (!running) {
      if (tickRef.current > 0) {
        const ts = useTimerStore.getState().timerState;
        useTimerStore.getState().setTimerState(ts);
      }
      tickRef.current = 0;
      return;
    }

    const interval = setInterval(() => {
      const ts = useTimerStore.getState().timerState;

      if (!ts.running) {
        clearInterval(interval);
        return;
      }

      tickRef.current++;

      const next = { ...ts };
      let shouldLog = false;

      if (ts.remaining <= 0) {
        next.overtime = ts.overtime + 1;
        if (next.overtime >= 120 * 60) {
          next.running = false;
          shouldLog = true;
        }
      } else {
        next.remaining = ts.remaining - 1;
      }

      // Persist every 30 ticks (~30 seconds) or on overtime cap
      if (tickRef.current % 30 === 0 || !next.running) {
        useTimerStore.getState().setTimerState(next);
      } else {
        useTimerStore.setState({ timerState: next });
      }

      // Auto-log session on overtime cap
      if (shouldLog) {
        const endedAt = new Date().toISOString();
        const startedAt = sessionStartRef.current ?? endedAt;
        sessionStartRef.current = null;
        const store = useTimerStore.getState();
        // Read task from block field if available (best effort)
        const elapsed = ts.duration - Math.max(0, ts.remaining);
        store.logSession({
          task: "",
          duration: ts.duration,
          actual: elapsed,
          overtime: next.overtime,
          mode: ts.mode,
          startedAt,
          endedAt,
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [running]);
}
