export interface TimerState {
  duration: number;
  remaining: number;
  running: boolean;
  overtime: number;
  wallStartedAt: number | null;
  mode: "work" | "break";
}

export interface TimerSettings {
  dailyTarget: number;
  autoOvertime: boolean;
  showNotification: boolean;
  selectedSound: string;
}

export interface TimerSession {
  id: string;
  task: string;
  duration: number;    // planned duration in seconds
  actual: number;      // elapsed seconds (duration - remaining)
  overtime: number;    // overtime seconds
  mode: "work" | "break";
  startedAt: string;   // ISO timestamp
  endedAt: string;     // ISO timestamp
}
