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
  const showSourcePicker = useStreamStore((s) => s.showSourcePicker);
  const screenSources = useStreamStore((s) => s.screenSources);
  const cameras = useStreamStore((s) => s.cameras);
  const pickSource = useStreamStore((s) => s.pickSource);
  const closeSourcePicker = useStreamStore((s) => s.closeSourcePicker);

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

// Viewport-level source picker modal (position: fixed, always visible even when block is collapsed)
export function FloatingSourcePickerModal() {
  useLang();
  const showSourcePicker = useStreamStore((s) => s.showSourcePicker);
  const screenSources = useStreamStore((s) => s.screenSources);
  const cameras = useStreamStore((s) => s.cameras);
  const pickSource = useStreamStore((s) => s.pickSource);
  const closeSourcePicker = useStreamStore((s) => s.closeSourcePicker);

  if (!showSourcePicker || !pickSource) return null;

  const handleClose = () => {
    if (closeSourcePicker) closeSourcePicker();
  };

  const deviceLabel = (dev: MediaDeviceInfo, idx: number) => {
    return dev.label || `Camera ${idx + 1}`;
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(0,0,0,0.8)",
      zIndex: 9000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{
        background: "#1c1c1e",
        borderRadius: 16,
        padding: "20px",
        maxWidth: 680,
        maxHeight: "75vh",
        width: "90vw",
        overflow: "auto",
        color: "#fff",
      }}>
        {/* Header + close button */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <span style={{ fontSize: "16px", fontWeight: 600 }}>
            {pick("選擇來源", "Choose Source")}
          </span>
          <button
            onClick={handleClose}
            style={{
              background: "none",
              border: "none",
              color: "#999",
              fontSize: "24px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Camera section */}
        {cameras.length > 0 && (
          <>
            <div style={{ color: "#aaa", fontSize: "11px", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {pick("攝影機", "Cameras")}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "10px", marginBottom: "20px" }}>
              {cameras.map((cam, i) => (
                <button
                  key={cam.deviceId}
                  onClick={() => {
                    pickSource(cam.deviceId, "camera");
                    handleClose();
                  }}
                  style={{
                    background: "#333",
                    border: "2px solid #555",
                    borderRadius: "8px",
                    padding: "12px",
                    cursor: "pointer",
                    color: "#fff",
                    fontSize: "12px",
                    transition: "border-color 0.15s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#0085ff"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#555"; }}
                >
                  📷 {deviceLabel(cam, i)}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Screen sources section */}
        {screenSources.length > 0 && (
          <>
            <div style={{ color: "#aaa", fontSize: "11px", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {pick("螢幕和視窗", "Screens & Windows")}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "10px" }}>
              {screenSources.map((src) => (
                <button
                  key={src.id}
                  onClick={() => {
                    pickSource(src.id, "screen");
                    handleClose();
                  }}
                  style={{
                    background: "#333",
                    border: "2px solid #555",
                    borderRadius: "8px",
                    padding: "8px",
                    cursor: "pointer",
                    color: "#fff",
                    fontSize: "11px",
                    overflow: "hidden",
                    transition: "border-color 0.15s",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#0085ff"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#555"; }}
                >
                  {src.thumbnail && (
                    <img
                      src={src.thumbnail}
                      alt={src.name}
                      style={{
                        width: "100%",
                        height: 80,
                        objectFit: "cover",
                        borderRadius: 4,
                      }}
                    />
                  )}
                  <div style={{ textAlign: "center", fontSize: "10px" }}>{src.name}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {screenSources.length === 0 && cameras.length === 0 && (
          <div style={{ color: "#aaa", textAlign: "center", padding: "20px" }}>
            {pick("沒有可用的來源", "No sources available")}
          </div>
        )}
      </div>
    </div>
  );
}
