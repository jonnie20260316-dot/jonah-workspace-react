import { useRef } from "react";
import { Play, Check } from "lucide-react";
import { useTimerStore } from "../stores/useTimerStore";
import { loadJSON, saveJSON } from "../utils/storage";
import { pick } from "../utils/i18n";
import { useLang } from "../hooks/useLang";

interface SoundItem {
  id: string;
  name: string;
  url: string;  // data URL for custom, empty for built-in
}

function getBuiltinSounds(): SoundItem[] {
  return [
    { id: "__none__", name: pick("無", "None"), url: "" },
    { id: "__bell__", name: pick("輕鐘", "Gentle Bell"), url: "" },
    { id: "__chime__", name: pick("音磬", "Chime"), url: "" },
  ];
}

// JW-29: Extract to named component
interface SoundPickerItemProps {
  sound: SoundItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function SoundPickerItem({ sound, isSelected, onSelect }: SoundPickerItemProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!sound.url) return; // built-in: no preview
    // JW-28: cleanup on each play
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const audio = new Audio(sound.url);
    audioRef.current = audio;
    audio.play().catch(() => {});
    audio.onended = () => { audioRef.current = null; };
  };

  return (
    <div
      className={`timer-sound-item ${isSelected ? "selected" : ""}`}
      onClick={() => onSelect(sound.id)}
    >
      <button className="timer-sound-play" onClick={handlePlay} title={pick("試聽", "Preview")}>
        <Play size={10} />
      </button>
      <span className="timer-sound-name">{sound.name}</span>
      {isSelected && <Check size={12} className="timer-sound-check" />}
    </div>
  );
}

export function TimerSettings() {
  useLang();
  const { timerSettings, setTimerSettings } = useTimerStore();
  const customSounds = loadJSON<SoundItem[]>("timer-sounds:custom", []) ?? [];
  const allSounds = [...getBuiltinSounds(), ...customSounds];

  const handleTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      setTimerSettings({ ...useTimerStore.getState().timerSettings, dailyTarget: val });
    }
  };

  const handleToggle = (key: "autoOvertime" | "showNotification") => {
    const ts = useTimerStore.getState().timerSettings;
    setTimerSettings({ ...ts, [key]: !ts[key] });
  };

  const handleSelectSound = (id: string) => {
    setTimerSettings({ ...useTimerStore.getState().timerSettings, selectedSound: id });
  };

  const handleUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "audio/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 1024 * 1024) {
        alert(pick("檔案太大（最大 1MB）", "File too large (max 1MB)"));
        return;
      }
      const existing = loadJSON<SoundItem[]>("timer-sounds:custom", []) ?? [];
      if (existing.length >= 5) {
        alert(pick("最多 5 個自訂音效", "Maximum 5 custom sounds"));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        const newSound: SoundItem = {
          id: `custom-${Date.now()}`,
          name: file.name.replace(/\.[^.]+$/, ""),
          url,
        };
        const updated = [...existing, newSound];
        saveJSON("timer-sounds:custom", updated);
        // Force re-render by patching settings
        setTimerSettings({ ...useTimerStore.getState().timerSettings });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  return (
    <div className="timer-settings-panel">
      <div className="timer-settings-title">
        {pick("計時器設定", "Timer Settings")}
      </div>

      {/* Daily Goal */}
      <div className="timer-setting-group">
        <div className="timer-setting-group-label">{pick("每日目標", "Daily Goal")}</div>
        <div className="timer-setting-row">
          <span>{pick("目標分鐘", "Target minutes")}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input
              type="number"
              min={0}
              max={960}
              step={15}
              value={timerSettings.dailyTarget}
              onChange={handleTargetChange}
            />
            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{pick("分", "min")}</span>
          </div>
        </div>
      </div>

      {/* Time's Up */}
      <div className="timer-setting-group">
        <div className="timer-setting-group-label">{pick("時間到", "Time's Up")}</div>
        <div className="timer-setting-row">
          <span>{pick("自動繼續計時", "Auto overtime")}</span>
          <label className="timer-setting-toggle">
            <input
              type="checkbox"
              checked={timerSettings.autoOvertime}
              onChange={() => handleToggle("autoOvertime")}
            />
            <span className="timer-setting-toggle-track" />
          </label>
        </div>
        <div className="timer-setting-row">
          <span>{pick("顯示通知", "Show notification")}</span>
          <label className="timer-setting-toggle">
            <input
              type="checkbox"
              checked={timerSettings.showNotification}
              onChange={() => handleToggle("showNotification")}
            />
            <span className="timer-setting-toggle-track" />
          </label>
        </div>
      </div>

      {/* Alarm Sound */}
      <div className="timer-setting-group">
        <div className="timer-setting-group-label">{pick("鬧鈴音效", "Alarm Sound")}</div>
        {allSounds.map((sound) => (
          <SoundPickerItem
            key={sound.id}
            sound={sound}
            isSelected={timerSettings.selectedSound === sound.id}
            onSelect={handleSelectSound}
          />
        ))}
        <button className="timer-upload-btn" onClick={handleUpload}>
          + {pick("上傳自訂音效", "Upload custom sound")}
        </button>
      </div>
    </div>
  );
}
