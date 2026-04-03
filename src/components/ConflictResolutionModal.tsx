import { useSyncStore } from "../stores/useSyncStore";
import { pick } from "../utils/i18n";
import { useLang } from "../hooks/useLang";
import type { ConflictInfo, SyncMeta } from "../types";

interface Props {
  conflictInfo: ConflictInfo;
  localMeta: SyncMeta;
  onKeepMine: () => void;
  onTakeTheirs: () => void;
}

export function ConflictResolutionModal({
  conflictInfo,
  localMeta,
  onKeepMine,
  onTakeTheirs,
}: Props) {
  useLang();
  const { deviceId } = useSyncStore();

  const formatTime = (isoString: string | null) => {
    if (!isoString) return pick("未推送", "Never pushed");
    return new Date(isoString).toLocaleString();
  };

  return (
    <div style={overlay} onClick={onKeepMine}>
      <div style={panel} onClick={(e) => e.stopPropagation()}>
        <div style={titleStyle}>
          ⚠️ {pick("同步衝突", "Sync Conflict")}
        </div>

        <div style={subtitleStyle}>
          {pick(
            "兩台裝置的資料不同步。請選擇保留哪個版本。",
            "Two devices have diverged. Choose which version to keep."
          )}
        </div>

        <div style={comparisonBox}>
          <div style={columnStyle}>
            <div style={columnTitleStyle}>
              {pick("本機", "This Device")}
            </div>
            <div style={infoRowStyle}>
              <span style={labelStyle}>{pick("裝置ID", "Device ID")}:</span>
              <code style={codeStyle}>{deviceId.slice(0, 8)}</code>
            </div>
            <div style={infoRowStyle}>
              <span style={labelStyle}>{pick("最後推送", "Last pushed")}:</span>
              <span>{formatTime(localMeta.lastPushedAt)}</span>
            </div>
            <div style={infoRowStyle}>
              <span style={labelStyle}>{pick("推送次數", "Push count")}:</span>
              <span>{localMeta.pushCount}</span>
            </div>
          </div>

          <div style={separatorStyle} />

          <div style={columnStyle}>
            <div style={columnTitleStyle}>
              {pick("遠端", "Remote")}
            </div>
            <div style={infoRowStyle}>
              <span style={labelStyle}>{pick("裝置ID", "Device ID")}:</span>
              <code style={codeStyle}>{conflictInfo.remote.deviceId.slice(0, 8)}</code>
            </div>
            <div style={infoRowStyle}>
              <span style={labelStyle}>{pick("推送時間", "Pushed at")}:</span>
              <span>{new Date(conflictInfo.remote.pushedAt).toLocaleString()}</span>
            </div>
            <div style={infoRowStyle}>
              <span style={labelStyle}>{pick("推送次數", "Push count")}:</span>
              <span>{conflictInfo.remote.pushCount}</span>
            </div>
          </div>
        </div>

        <div style={warningBox}>
          ⚠️ {pick(
            "遠端版本較舊。選擇「使用遠端版本」會覆蓋本機的新資料。",
            "Remote is older. Choosing \"Take Theirs\" will overwrite your newer local data."
          )}
        </div>

        <div style={buttonGroupStyle}>
          <button onClick={onKeepMine} style={keepBtn}>
            {pick("保留本機版本", "Keep Mine")}
          </button>
          <button onClick={onTakeTheirs} style={takeBtn}>
            {pick("使用遠端版本", "Take Theirs")}
          </button>
        </div>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(36,50,49,0.35)",
  backdropFilter: "blur(5px)",
  WebkitBackdropFilter: "blur(5px)",
  zIndex: 2100,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const panel: React.CSSProperties = {
  background: "var(--surface-1)",
  borderRadius: "var(--radius-xl)",
  padding: "24px 28px",
  width: 420,
  maxHeight: "80vh",
  overflowY: "auto",
  boxShadow: "var(--shadow-modal)",
  animation: "fabPickerIn 260ms var(--ease-spring) forwards",
};

const titleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  marginBottom: 6,
  color: "var(--text-primary)",
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 13,
  color: "var(--text-secondary)",
  marginBottom: 18,
  lineHeight: 1.5,
};

const comparisonBox: React.CSSProperties = {
  background: "var(--surface-0)",
  borderRadius: "var(--radius-md)",
  padding: "16px",
  marginBottom: 16,
  display: "grid",
  gridTemplateColumns: "1fr 1px 1fr",
  gap: "16px",
  alignItems: "start",
};

const columnStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const columnTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "var(--text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  marginBottom: "4px",
};

const infoRowStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--text-secondary)",
  lineHeight: 1.5,
  display: "flex",
  justifyContent: "space-between",
  gap: "8px",
};

const labelStyle: React.CSSProperties = {
  fontWeight: 600,
};

const codeStyle: React.CSSProperties = {
  fontFamily: "monospace",
  fontSize: 11,
  background: "rgba(0,0,0,0.05)",
  padding: "2px 6px",
  borderRadius: "3px",
  color: "var(--text-primary)",
};

const separatorStyle: React.CSSProperties = {
  background: "var(--line)",
};

const warningBox: React.CSSProperties = {
  background: "#fff3f3",
  border: "1px solid #fcc",
  borderRadius: "var(--radius-md)",
  padding: "10px 12px",
  fontSize: 12,
  color: "#c44",
  marginBottom: 16,
  lineHeight: 1.5,
};

const buttonGroupStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  justifyContent: "flex-end",
};

const keepBtn: React.CSSProperties = {
  padding: "8px 16px",
  fontSize: 12,
  fontWeight: 600,
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-md)",
  background: "var(--surface-1)",
  color: "var(--text-primary)",
  cursor: "pointer",
  transition: "all 150ms ease-out",
};

const takeBtn: React.CSSProperties = {
  padding: "8px 16px",
  fontSize: 12,
  fontWeight: 600,
  border: "none",
  borderRadius: "var(--radius-md)",
  background: "#c44",
  color: "#fff",
  cursor: "pointer",
  transition: "all 150ms ease-out",
};
