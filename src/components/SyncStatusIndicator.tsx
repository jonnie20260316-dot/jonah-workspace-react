import { useEffect, useState } from "react";
import { Loader2, Check, AlertCircle, WifiOff } from "lucide-react";
import { useSyncStore } from "../stores/useSyncStore";
import { pick } from "../utils/i18n";

interface Props {
  onConflictClick?: () => void;
}

export function SyncStatusIndicator({ onConflictClick }: Props) {
  const { syncStatus } = useSyncStore();
  const [visible, setVisible] = useState(false);

  // Fade out "synced" after 3s
  useEffect(() => {
    if (syncStatus === "idle") {
      setVisible(false);
      return;
    }
    setVisible(true);
    if (syncStatus === "synced") {
      const timer = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [syncStatus]);

  if (!visible || syncStatus === "idle") return null;

  const configs = {
    syncing: {
      icon: <Loader2 size={16} strokeWidth={2} className="sync-spinning" />,
      color: "var(--text-tertiary)",
      label: pick("同步中", "Syncing"),
    },
    synced: {
      icon: <Check size={16} strokeWidth={2.5} />,
      color: "var(--success)",
      label: pick("已同步", "Synced"),
    },
    error: {
      icon: <AlertCircle size={16} strokeWidth={2} />,
      color: "var(--danger)",
      label: pick("同步失敗", "Sync error"),
    },
    conflict: {
      icon: <AlertCircle size={16} strokeWidth={2} />,
      color: "var(--gold)",
      label: pick("衝突", "Conflict"),
    },
    offline: {
      icon: <WifiOff size={16} strokeWidth={1.8} />,
      color: "var(--text-tertiary)",
      label: pick("離線", "Offline"),
    },
  };

  const c = configs[syncStatus as keyof typeof configs];
  if (!c) return null;

  const isClickable = syncStatus === "conflict" && onConflictClick;

  return (
    <div
      title={c.label}
      onClick={() => isClickable && onConflictClick?.()}
      style={{
        display: "flex",
        alignItems: "center",
        color: c.color,
        opacity: syncStatus === "synced" ? undefined : 1,
        animation: syncStatus === "synced" ? "syncedFade 3s var(--ease-standard) forwards" : undefined,
        cursor: isClickable ? "pointer" : "default",
        transition: isClickable ? "opacity 200ms ease-out" : undefined,
      }}
      onMouseEnter={(e) => {
        if (isClickable) {
          e.currentTarget.style.opacity = "0.7";
        }
      }}
      onMouseLeave={(e) => {
        if (isClickable) {
          e.currentTarget.style.opacity = "1";
        }
      }}
    >
      {c.icon}
    </div>
  );
}
