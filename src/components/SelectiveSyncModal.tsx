import { useState } from "react";
import { SYNC_CATEGORIES } from "../utils/sync";
import { pick } from "../utils/i18n";
import { useLang } from "../hooks/useLang";

interface Props {
  mode: "push" | "pull";
  isDanger?: boolean;       // Case C conflict warning
  remoteInfo?: {
    deviceId: string;
    pushedAt: string;
    blockCount: number;
  };
  onConfirm: (selectedIds: string[]) => void;
  onCancel: () => void;
}

export function SelectiveSyncModal({ mode, isDanger, remoteInfo, onConfirm, onCancel }: Props) {
  useLang();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(SYNC_CATEGORIES.map((c) => c.id))
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const title = mode === "push"
    ? pick("選擇要推送的類別", "Choose categories to push")
    : pick("選擇要拉取的類別", "Choose categories to pull");

  return (
    <div style={overlay}>
      <div style={panel}>
        <div style={titleStyle}>{title}</div>

        {isDanger && (
          <div style={dangerBox}>
            ⚠️ {pick(
              "遠端版本比本機舊，強制拉取可能覆蓋較新的本機資料。",
              "Remote is older than local — pulling may overwrite newer local data."
            )}
          </div>
        )}

        {remoteInfo && (
          <div style={infoBox}>
            <div>{pick("裝置", "Device")}: <code>{remoteInfo.deviceId.slice(0, 8)}</code></div>
            <div>{pick("推送時間", "Pushed at")}: {new Date(remoteInfo.pushedAt).toLocaleString()}</div>
            <div>{pick("區塊數量", "Blocks")}: {remoteInfo.blockCount}</div>
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          {SYNC_CATEGORIES.map((cat) => (
            <label key={cat.id} style={rowStyle}>
              <input
                type="checkbox"
                checked={selected.has(cat.id)}
                onChange={() => toggle(cat.id)}
                style={{ marginRight: 8 }}
              />
              {pick(cat.zhLabel, cat.enLabel)}
            </label>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={cancelBtn}>
            {pick("取消", "Cancel")}
          </button>
          <button
            onClick={() => onConfirm(Array.from(selected))}
            disabled={selected.size === 0}
            style={{ ...confirmBtn, background: isDanger ? "#c44" : "#1a1a1a" }}
          >
            {isDanger
              ? pick("確認覆蓋", "Overwrite anyway")
              : mode === "push"
                ? pick("推送", "Push")
                : pick("拉取", "Pull")}
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
  zIndex: 500,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const panel: React.CSSProperties = {
  background: "var(--surface-1)",
  borderRadius: "var(--radius-xl)",
  padding: "22px 24px",
  width: 320,
  maxHeight: "80vh",
  overflowY: "auto",
  boxShadow: "var(--shadow-modal)",
  animation: "fabPickerIn 260ms var(--ease-spring) forwards",
};

const titleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  marginBottom: 12,
};

const dangerBox: React.CSSProperties = {
  background: "#fff3f3",
  border: "1px solid #fcc",
  borderRadius: 6,
  padding: "8px 10px",
  fontSize: 12,
  color: "#c44",
  marginBottom: 12,
};

const infoBox: React.CSSProperties = {
  background: "#f8f8f8",
  borderRadius: 6,
  padding: "8px 10px",
  fontSize: 11,
  color: "#555",
  marginBottom: 12,
  lineHeight: 1.6,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: "5px 0",
  fontSize: 13,
  cursor: "pointer",
};

const cancelBtn: React.CSSProperties = {
  padding: "6px 14px",
  fontSize: 12,
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-md)",
  background: "none",
  cursor: "pointer",
  color: "var(--text-secondary)",
};

const confirmBtn: React.CSSProperties = {
  padding: "6px 14px",
  fontSize: 12,
  border: "none",
  borderRadius: "var(--radius-md)",
  color: "#fff",
  cursor: "pointer",
};
