import { Mic, MicOff, MonitorUp } from "lucide-react";
import { useStreamStore } from "../stores/useStreamStore";
import { pick } from "../utils/i18n";
import { useLang } from "../hooks/useLang";

export function FloatingStreamControls() {
  useLang();
  const isStreaming = useStreamStore((s) => s.isStreaming);
  const micMuted = useStreamStore((s) => s.micMuted);
  const toggleMicMute = useStreamStore((s) => s.toggleMicMute);
  const openSourcePicker = useStreamStore((s) => s.openSourcePicker);

  if (!isStreaming) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 12,
        right: 16,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        gap: 4,
        height: 44,
        padding: "0 8px",
        background: "rgba(255, 252, 246, 0.88)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        border: "1px solid rgba(255, 255, 255, 0.55)",
        borderRadius: "var(--radius-xl, 14px)",
        boxShadow: "var(--shadow-overlay, 0 4px 24px rgba(0,0,0,0.12))",
      }}
    >
      {/* Live indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 6px" }}>
        <span style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          backgroundColor: "#22c55e",
          display: "inline-block",
          boxShadow: "0 0 0 2px rgba(34,197,94,0.3)",
        }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: "#22c55e", letterSpacing: "0.5px" }}>
          LIVE
        </span>
      </div>

      <div style={{ width: 1, height: 24, background: "rgba(0,0,0,0.1)" }} />

      {/* Source switch button */}
      {openSourcePicker && (
        <button
          onClick={openSourcePicker}
          title={pick("切換來源", "Switch source")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "0 8px",
            height: 32,
            background: "none",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            color: "#333",
            fontSize: 12,
            fontWeight: 500,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.06)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
        >
          <MonitorUp size={16} strokeWidth={2.2} />
          <span>{pick("切換來源", "Switch")}</span>
        </button>
      )}

      {/* Mic mute button */}
      {toggleMicMute && (
        <button
          onClick={toggleMicMute}
          title={micMuted ? pick("取消靜音", "Unmute mic") : pick("靜音麥克風", "Mute mic")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "0 8px",
            height: 32,
            background: micMuted ? "rgba(198,40,40,0.1)" : "none",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            color: micMuted ? "#c62828" : "#333",
            fontSize: 12,
            fontWeight: 500,
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = micMuted ? "rgba(198,40,40,0.18)" : "rgba(0,0,0,0.06)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = micMuted ? "rgba(198,40,40,0.1)" : "none";
          }}
        >
          {micMuted
            ? <MicOff size={16} strokeWidth={2.2} />
            : <Mic size={16} strokeWidth={2.2} />}
          <span>{micMuted ? pick("靜音中", "Muted") : pick("麥克風", "Mic")}</span>
        </button>
      )}
    </div>
  );
}
