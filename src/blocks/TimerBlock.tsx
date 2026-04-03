import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import { useBlockField } from "../hooks/useBlockField";
import { useTimerStore } from "../stores/useTimerStore";
import { useSessionStore } from "../stores/useSessionStore";
import { pick } from "../utils/i18n";
import { useLang } from "../hooks/useLang";
import { TimerRing } from "./TimerRing";
import { DailyFocusStats } from "./DailyFocusStats";
import { SessionLog } from "./SessionLog";
import { TimerSettings } from "./TimerSettings";
import type { Block } from "../types";

interface TimerBlockProps {
  block: Block;
}

export function TimerBlock({ block }: TimerBlockProps) {
  useLang();
  const [duration, setDuration] = useBlockField(block.id, "duration", "90");
  const [task, setTask] = useBlockField(block.id, "task", "");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { timerState, setTimerState, logSession, loadSessions } = useTimerStore();
  const { activeDate } = useSessionStore();

  const workPresets = [15, 30, 45, 60, 90];
  const restPresets = [5, 10, 15, 20, 30];
  const isRest = timerState.mode === "break";
  const presets = isRest ? restPresets : workPresets;

  // Load sessions when date changes (JW-24: go through store action)
  useEffect(() => {
    loadSessions(activeDate);
  }, [activeDate, loadSessions]);

  const handlePresetClick = (preset: number) => {
    setDuration(String(preset));
    const ts = useTimerStore.getState().timerState;
    if (!ts.running) {
      setTimerState({ ...ts, duration: preset * 60, remaining: preset * 60, overtime: 0 });
    }
  };

  const handleModeToggle = (mode: "work" | "break") => {
    const ts = useTimerStore.getState().timerState;
    if (ts.running) return;
    setTimerState({ ...ts, mode });
  };

  const handleStart = () => {
    const ts = useTimerStore.getState().timerState;
    const dur = (parseInt(duration, 10) || 90) * 60;
    const remaining = ts.remaining > 0 ? ts.remaining : dur;
    setTimerState({ ...ts, running: true, duration: dur, remaining, wallStartedAt: Date.now() });
  };

  const handlePause = () => {
    const ts = useTimerStore.getState().timerState;
    const elapsed = ts.duration - Math.max(0, ts.remaining);
    setTimerState({ ...ts, running: false, wallStartedAt: null });
    // Log session if meaningful work done (> 60 seconds)
    if (elapsed > 60) {
      const endedAt = new Date().toISOString();
      const startedAt = ts.wallStartedAt ? new Date(ts.wallStartedAt).toISOString() : endedAt;
      logSession({
        task: task || "",
        duration: ts.duration,
        actual: elapsed,
        overtime: ts.overtime,
        mode: ts.mode,
        startedAt,
        endedAt,
      });
    }
  };

  const handleReset = () => {
    const ts = useTimerStore.getState().timerState;
    const dur = (parseInt(duration, 10) || 90) * 60;
    setTimerState({ ...ts, running: false, remaining: dur, duration: dur, overtime: 0, wallStartedAt: null });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Settings trigger */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          className={`timer-settings-btn ${settingsOpen ? "active" : ""}`}
          onClick={() => setSettingsOpen((v) => !v)}
          title={pick("計時器設定", "Timer Settings")}
        >
          <Settings size={14} />
        </button>
      </div>

      {/* Mode toggle — Apple Segmented Control style */}
      <div style={{
        display: "flex",
        gap: 4,
        padding: 3,
        background: "var(--surface-1)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--line)",
      }}>
        {(["work", "break"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => handleModeToggle(mode)}
            style={{
              flex: 1,
              padding: "5px 0",
              fontSize: 12,
              fontWeight: 500,
              border: "none",
              borderRadius: "var(--radius-sm)",
              cursor: timerState.running ? "default" : "pointer",
              background: timerState.mode === mode ? "var(--surface-raised)" : "none",
              color: timerState.mode === mode ? "var(--ink)" : "var(--text-tertiary)",
              boxShadow: timerState.mode === mode ? "var(--shadow-raised)" : "none",
              transition: "all var(--dur-fast) var(--ease-standard)",
            }}
          >
            {mode === "work" ? pick("專注", "Focus") : pick("休息", "Rest")}
          </button>
        ))}
      </div>

      {/* Preset buttons */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${presets.length}, 1fr)`, gap: 4 }}>
        {presets.map((preset) => {
          const active = parseInt(duration) === preset;
          return (
            <button
              key={preset}
              onClick={() => handlePresetClick(preset)}
              style={{
                padding: "6px 4px",
                fontSize: 11,
                fontWeight: active ? 600 : 400,
                background: active ? "var(--ink)" : "var(--surface-1)",
                color: active ? "var(--text-inverted)" : "var(--text-secondary)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                transition: "all var(--dur-fast) var(--ease-standard)",
              }}
            >
              {preset}m
            </button>
          );
        })}
      </div>

      {/* Timer Ring (replaces big time display) */}
      <TimerRing size={200} />

      {/* Task input */}
      <div>
        <label>{pick("任務", "Task")}</label>
        <input
          type="text"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder={pick("正在做什麼…", "What are you working on…")}
        />
      </div>

      {/* Controls */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
        <button
          onClick={handleStart}
          disabled={timerState.running}
          style={{
            padding: "7px 0",
            fontSize: 12,
            fontWeight: 500,
            background: timerState.running ? "var(--surface-1)" : "var(--ink)",
            color: timerState.running ? "var(--text-tertiary)" : "var(--text-inverted)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-sm)",
            cursor: timerState.running ? "default" : "pointer",
          }}
        >
          {pick("開始", "Start")}
        </button>
        <button
          onClick={handlePause}
          disabled={!timerState.running}
          style={{
            padding: "7px 0",
            fontSize: 12,
            background: "var(--surface-1)",
            color: !timerState.running ? "var(--text-tertiary)" : "var(--ink)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-sm)",
            cursor: !timerState.running ? "default" : "pointer",
          }}
        >
          {pick("暫停", "Pause")}
        </button>
        <button
          onClick={handleReset}
          style={{
            padding: "7px 0",
            fontSize: 12,
            background: "var(--surface-1)",
            color: "var(--text-secondary)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
          }}
        >
          {pick("重設", "Reset")}
        </button>
      </div>

      {/* Daily stats + session log */}
      <div className="timer-divider" />
      <DailyFocusStats />
      <SessionLog date={activeDate} />

      {/* Settings panel (collapsible) */}
      {settingsOpen && <TimerSettings />}
    </div>
  );
}
