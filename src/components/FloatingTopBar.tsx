import { useState } from "react";
import { Menu, Save, Settings, Check } from "lucide-react";
import { DateNav } from "./DateNav";
import { SyncStatusIndicator } from "./SyncStatusIndicator";
import { useUIStore } from "../stores/useUIStore";
import { pick } from "../utils/i18n";
import { useLang } from "../hooks/useLang";
import { useBlockStore } from "../stores/useBlockStore";
import { useViewportStore } from "../stores/useViewportStore";
import { useSyncStore } from "../stores/useSyncStore";
import { saveJSON, backupToFile } from "../utils/storage";

export function FloatingTopBar() {
  useLang();
  const { toggleSidebar, toggleGearMenu, sidebarOpen, gearMenuOpen } = useUIStore();
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    const { blocks } = useBlockStore.getState();
    const { viewport } = useViewportStore.getState();
    saveJSON("blocks", blocks);
    saveJSON("viewport", viewport);

    // Persist to file backup (Electron only)
    await backupToFile();

    // Trigger git sync if enabled
    const { githubEnabled, githubRepo, githubToken } = useSyncStore.getState();
    if (githubEnabled && githubRepo && githubToken) {
      useSyncStore.getState().githubSyncNow();
    }

    // Brief checkmark confirmation
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="floating-top-bar" style={barStyle}>
      {/* Left */}
      <div style={sectionStyle}>
        <button
          onClick={toggleSidebar}
          className="top-bar-btn"
          style={{ background: sidebarOpen ? "rgba(36,50,49,0.08)" : "none" }}
          title={pick("側欄", "Sidebar")}
        >
          <Menu size={18} strokeWidth={1.8} />
        </button>
      </div>

      {/* Center */}
      <div style={sectionStyle}>
        <DateNav />
      </div>

      {/* Right */}
      <div style={{ ...sectionStyle, gap: 4 }}>
        <SyncStatusIndicator
          onConflictClick={() => {
            if (!gearMenuOpen) {
              toggleGearMenu();
            }
          }}
        />
        <button
          onClick={handleSave}
          className="top-bar-btn"
          title={pick("儲存", "Save")}
        >
          {saved ? <Check size={18} strokeWidth={1.8} /> : <Save size={18} strokeWidth={1.8} />}
        </button>
        <button
          onClick={toggleGearMenu}
          className="top-bar-btn"
          title={pick("設定", "Settings")}
        >
          <Settings size={18} strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
}

const barStyle: React.CSSProperties = {
  position: "fixed",
  top: 12,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 200,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  background: "rgba(255, 252, 246, 0.88)",
  backdropFilter: "blur(20px) saturate(180%)",
  WebkitBackdropFilter: "blur(20px) saturate(180%)",
  border: "1px solid rgba(255, 255, 255, 0.55)",
  borderBottom: "1px solid rgba(36, 50, 49, 0.12)",
  borderRadius: "var(--radius-xl)" as unknown as number,
  padding: "0 12px",
  height: 44,
  boxShadow: "var(--shadow-overlay)" as unknown as string,
  minWidth: 340,
  userSelect: "none",
};

const sectionStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
};
