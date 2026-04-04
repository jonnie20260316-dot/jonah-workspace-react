import { useEffect, useRef, useState } from "react";
import { useUIStore } from "../stores/useUIStore";
import { useSessionStore } from "../stores/useSessionStore";
import { useBlockStore } from "../stores/useBlockStore";
import { useViewportStore } from "../stores/useViewportStore";
import { useSyncStore } from "../stores/useSyncStore";
import { pick } from "../utils/i18n";
import { saveJSON } from "../utils/storage";
import { STORAGE_PREFIX } from "../constants";
import { normaliseViewport } from "../utils/viewport";
import { SelectiveSyncModal } from "./SelectiveSyncModal";
import { ConflictResolutionModal } from "./ConflictResolutionModal";
import type { Lang, SyncPayload, ConflictInfo, UpdateStatus } from "../types";

function storageUsageKB(): number {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i) ?? "";
    if (k.startsWith(STORAGE_PREFIX)) {
      total += (localStorage.getItem(k) ?? "").length;
    }
  }
  return Math.round(total / 1024);
}

export function GearMenu() {
  const { gearMenuOpen, closeGearMenu } = useUIStore();
  const { lang, snapMode, overlapMode, textScale, setLang, setSnapMode, setOverlapMode, setTextScale } = useSessionStore();
  const { syncMeta, deviceId, syncStatus, clearConflict, gitEnabled, gitDir, gitRemote, gitSyncStatus, gitLastSyncAt, gitError, setGitEnabled, gitSetup, gitSyncNow } = useSyncStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const conflictResolveRef = useRef<((value: boolean) => void) | null>(null);
  const [syncModal, setSyncModal] = useState<{
    mode: "push" | "pull";
    isDanger?: boolean;
    remoteInfo?: { deviceId: string; pushedAt: string; blockCount: number };
    resolve?: (ids: string[] | null) => void;
  } | null>(null);
  const [conflictModal, setConflictModal] = useState<ConflictInfo | null>(null);
  const [gitRemoteInput, setGitRemoteInput] = useState<string>(gitRemote);
  const [gitSetupLoading, setGitSetupLoading] = useState(false);

  // Close on outside click
  useEffect(() => {
    if (!gearMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closeGearMenu();
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [gearMenuOpen, closeGearMenu]);

  if (!gearMenuOpen) return null;

  const handleExport = () => {
    const blocks = useBlockStore.getState().blocks;
    const viewport = useViewportStore.getState().viewport;
    const data = { blocks, viewport, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jonah-workspace-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    closeGearMenu();
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (Array.isArray(data.blocks)) {
            saveJSON("blocks", data.blocks);
            useBlockStore.setState({ blocks: data.blocks });
          }
          if (data.viewport) {
            const vp = normaliseViewport(data.viewport);
            saveJSON("viewport", vp);
            useViewportStore.setState({ viewport: vp });
          }
          closeGearMenu();
        } catch {
          alert(pick("匯入失敗，請確認 JSON 格式", "Import failed — check JSON format"));
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handlePush = async () => {
    const selectedIds = await new Promise<string[] | null>((resolve) => {
      setSyncModal({ mode: "push", resolve });
    });
    setSyncModal(null);
    if (!selectedIds) return;
    await useSyncStore.getState().push(selectedIds);
  };

  const handlePull = async () => {
    const selectedIds = await new Promise<string[] | null>((resolve) => {
      setSyncModal({ mode: "pull", resolve });
    });
    setSyncModal(null);
    if (!selectedIds) return;
    await useSyncStore.getState().pull({
      selectedIds,
      onConflict: async (remote: SyncPayload) => {
        return new Promise<boolean>((resolve) => {
          conflictResolveRef.current = resolve;
          setConflictModal({
            remote,
            detectedAt: new Date().toISOString(),
          });
        });
      },
    });
  };

  const handleDisconnect = async () => {
    await useSyncStore.getState().clearSyncHandle();
  };

  const handleGitSetup = async () => {
    if (!window.electronAPI?.openDirectory) return;
    setGitSetupLoading(true);
    try {
      const dirPath = await window.electronAPI.openDirectory();
      if (!dirPath) {
        setGitSetupLoading(false);
        return;
      }
      const result = await gitSetup(dirPath, gitRemoteInput);
      if (result.ok) {
        setGitRemoteInput("");
      } else {
        alert(pick("Git 初始化失敗", "Git init failed") + ": " + (result.error ?? "unknown error"));
      }
    } catch (err) {
      alert(pick("錯誤", "Error") + ": " + (err as Error).message);
    } finally {
      setGitSetupLoading(false);
    }
  };

  const handleGitSyncNow = async () => {
    try {
      await gitSyncNow();
    } catch (err) {
      console.error("[gear] git sync failed:", err);
    }
  };

  function timeAgoShort(iso: string | null): string {
    if (!iso) return pick("從未", "Never");
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return pick(`${diff}秒前`, `${diff}s ago`);
    const mins = Math.floor(diff / 60);
    if (mins < 60) return pick(`${mins}分前`, `${mins}m ago`);
    return pick(`${Math.floor(mins / 60)}小時前`, `${Math.floor(mins / 60)}h ago`);
  }

  const usedKB = storageUsageKB();
  const estimatedMaxKB = 5120; // 5 MB typical localStorage limit
  const pct = Math.min(100, Math.round((usedKB / estimatedMaxKB) * 100));

  return (
    <div ref={panelRef} style={panelStyle}>
      <div style={headerStyle}>{pick("設定", "Settings")}</div>

      {/* Language */}
      <Section label={pick("語言", "Language")}>
        <ToggleRow
          left="中文"
          right="EN"
          active={lang === "zh" ? "left" : "right"}
          onLeft={() => setLang("zh" as Lang)}
          onRight={() => setLang("en" as Lang)}
        />
      </Section>

      {/* Snap */}
      <Section label={pick("吸附格線", "Snap to grid")}>
        <ToggleRow
          left={pick("開", "On")}
          right={pick("關", "Off")}
          active={snapMode ? "left" : "right"}
          onLeft={() => setSnapMode(true)}
          onRight={() => setSnapMode(false)}
        />
      </Section>

      {/* Overlap */}
      <Section label={pick("允許重疊", "Allow overlap")}>
        <ToggleRow
          left={pick("開", "On")}
          right={pick("關", "Off")}
          active={overlapMode ? "left" : "right"}
          onLeft={() => setOverlapMode(true)}
          onRight={() => setOverlapMode(false)}
        />
      </Section>

      {/* Font Size */}
      <Section label={pick("字型大小", "Font Size")}>
        <div style={{ display: "flex", gap: 4 }}>
          {([0.82, 0.9, 1.0, 1.1, 1.25] as const).map((scale) => (
            <button
              key={scale}
              onClick={() => setTextScale(scale)}
              style={{
                flex: 1,
                padding: "4px 0",
                fontSize: Math.round(11 * scale),
                border: "1px solid var(--line)",
                borderRadius: 4,
                cursor: "pointer",
                background: textScale === scale ? "#1a1a1a" : "#eee",
                color: textScale === scale ? "#fff" : "#555",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              A
            </button>
          ))}
        </div>
      </Section>

      <div style={divider} />

      {/* Sync */}
      <Section label={pick("同步", "Sync")}>
        <div style={{ fontSize: 11, color: "#888", marginBottom: 6, lineHeight: 1.5 }}>
          <div>{pick("裝置", "Device")}: <code style={{ fontSize: 10 }}>{deviceId ? deviceId.slice(0, 8) : "—"}</code></div>
          <div>{pick("上次同步", "Last sync")}: {timeAgoShort(syncMeta.lastPushedAt)}</div>
          {syncStatus === "syncing" && <div style={{ color: "#888" }}>{pick("同步中…", "Syncing…")}</div>}
          {syncStatus === "error" && <div style={{ color: "#e55" }}>{pick("同步失敗", "Sync error")}</div>}
        </div>
        <button onClick={handlePush} style={actionBtn} disabled={syncStatus === "syncing"}>
          ↑ {pick("推送到 iCloud", "Push to iCloud")}
        </button>
        <button onClick={handlePull} style={actionBtn} disabled={syncStatus === "syncing"}>
          ↓ {pick("從 iCloud 拉取", "Pull from iCloud")}
        </button>
        <button onClick={handleDisconnect} style={{ ...actionBtn, color: "#999", borderColor: "transparent" }}>
          ✕ {pick("中斷資料夾連線", "Disconnect folder")}
        </button>
      </Section>

      <div style={divider} />

      {/* Git Sync — Electron only */}
      {window.electronAPI?.isElectron && (
        <>
          <Section label={pick("Git 同步", "Git Sync")}>
            <ToggleRow
              left={pick("開", "On")}
              right={pick("關", "Off")}
              active={gitEnabled ? "left" : "right"}
              onLeft={() => setGitEnabled(true)}
              onRight={() => setGitEnabled(false)}
            />
            {gitEnabled && (
              <div style={{ marginTop: 8, fontSize: 11, color: "#888", lineHeight: 1.6 }}>
                <div style={{ marginBottom: 6 }}>
                  {pick("資料夾", "Folder")}: <code style={{ fontSize: 10, display: "block", wordBreak: "break-all" }}>{gitDir || "—"}</code>
                </div>
                {gitLastSyncAt && (
                  <div style={{ marginBottom: 6 }}>
                    {pick("上次同步", "Last synced")}: {timeAgoShort(gitLastSyncAt)}
                  </div>
                )}
                {gitError && (
                  <div style={{ color: "#e55", marginBottom: 6 }}>
                    {gitError}
                  </div>
                )}
                {gitSyncStatus === "syncing" && (
                  <div style={{ color: "#888", marginBottom: 6 }}>
                    {pick("同步中…", "Syncing…")}
                  </div>
                )}
              </div>
            )}
            {!gitEnabled || !gitDir ? (
              <>
                <input
                  type="text"
                  placeholder={pick("GitHub 遠端 URL", "GitHub remote URL")}
                  value={gitRemoteInput}
                  onChange={(e) => setGitRemoteInput(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    fontSize: 12,
                    border: "1px solid var(--line)",
                    borderRadius: "var(--radius-sm)",
                    marginBottom: 6,
                    boxSizing: "border-box",
                  }}
                />
                <button
                  onClick={handleGitSetup}
                  disabled={gitSetupLoading || !gitRemoteInput.trim()}
                  style={{ ...actionBtn, opacity: gitSetupLoading || !gitRemoteInput.trim() ? 0.6 : 1 }}
                >
                  {gitSetupLoading ? pick("初始化中…", "Initializing…") : pick("設定 Git", "Setup Git")}
                </button>
              </>
            ) : (
              <button onClick={handleGitSyncNow} style={actionBtn} disabled={gitSyncStatus === "syncing"}>
                ⟳ {pick("立即同步", "Sync Now")}
              </button>
            )}
          </Section>
          <div style={divider} />
        </>
      )}

      {/* Export / Import */}
      <button onClick={handleExport} style={actionBtn}>
        ↓ {pick("匯出 JSON", "Export JSON")}
      </button>
      <button onClick={handleImport} style={actionBtn}>
        ↑ {pick("匯入 JSON", "Import JSON")}
      </button>

      <div style={divider} />

      {/* Storage meter */}
      <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
        {pick("儲存使用量", "Storage used")}: {usedKB} KB / {estimatedMaxKB} KB
      </div>
      <div style={{ height: 4, background: "#e8e4dc", borderRadius: 2, marginTop: 4 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: pct > 80 ? "#e55" : "#4a9", borderRadius: 2, transition: "width 0.3s" }} />
      </div>

      {/* App updater — Electron only */}
      {window.electronAPI?.isElectron && (
        <>
          <div style={divider} />
          <AppUpdater />
        </>
      )}

      {/* Selective sync modal */}
      {syncModal && (
        <SelectiveSyncModal
          mode={syncModal.mode}
          isDanger={syncModal.isDanger}
          remoteInfo={syncModal.remoteInfo}
          onConfirm={(ids) => syncModal.resolve?.(ids)}
          onCancel={() => { syncModal.resolve?.(null); setSyncModal(null); }}
        />
      )}

      {/* Conflict resolution modal */}
      {conflictModal && (
        <ConflictResolutionModal
          conflictInfo={conflictModal}
          localMeta={syncMeta}
          onKeepMine={() => {
            conflictResolveRef.current?.(false);
            setConflictModal(null);
            clearConflict();
          }}
          onTakeTheirs={() => {
            conflictResolveRef.current?.(true);
            setConflictModal(null);
            clearConflict();
          }}
        />
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

function ToggleRow({ left, right, active, onLeft, onRight }: {
  left: string; right: string;
  active: "left" | "right";
  onLeft: () => void; onRight: () => void;
}) {
  const base: React.CSSProperties = {
    flex: 1, padding: "4px 0", fontSize: 12, border: "none", cursor: "pointer",
    borderRadius: 4, transition: "background 0.15s, color 0.15s",
  };
  return (
    <div style={{ display: "flex", gap: 4 }}>
      <button onClick={onLeft} style={{ ...base, background: active === "left" ? "#1a1a1a" : "#eee", color: active === "left" ? "#fff" : "#555" }}>{left}</button>
      <button onClick={onRight} style={{ ...base, background: active === "right" ? "#1a1a1a" : "#eee", color: active === "right" ? "#fff" : "#555" }}>{right}</button>
    </div>
  );
}

// ─── AppUpdater component ─────────────────────────────────────────────────────
function AppUpdater() {
  const [update, setUpdate] = useState<UpdateStatus>({ status: "idle" });
  const [version, setVersion] = useState<string>("");
  const [deferred, setDeferred] = useState(false);

  useEffect(() => {
    window.electronAPI!.getAppVersion().then(setVersion);
    const unsub = window.electronAPI!.onUpdateStatus((s) => {
      setUpdate(s);
      // Reset deferred flag whenever a new update cycle starts
      if (s.status === "idle" || s.status === "checking") setDeferred(false);
    });
    return unsub;
  }, []);

  // Auto-clear "up-to-date" after 4 seconds
  useEffect(() => {
    if (update.status === "up-to-date") {
      const t = setTimeout(() => setUpdate({ status: "idle" }), 4000);
      return () => clearTimeout(t);
    }
  }, [update.status]);

  const { status } = update;

  const handleClick = () => {
    if (status === "idle" || status === "up-to-date" || status === "error") {
      setUpdate({ status: "checking" });
      window.electronAPI!.checkForUpdates();
    } else if (status === "available") {
      window.electronAPI!.downloadUpdate();
    } else if (status === "ready") {
      window.electronAPI!.installUpdate();
    }
  };

  const handleDefer = () => {
    window.electronAPI!.deferUpdate();
    setDeferred(true);
  };

  // ── Button label & style ──────────────────────────────────────────────────
  let label: string;
  let btnBg = "rgba(36,50,49,0.08)";
  let btnColor = "var(--text-secondary)";
  let btnDisabled = false;

  const newVer =
    (update as { version?: string }).version ?? "";

  if (status === "checking") {
    label = pick("檢查中…", "Checking…");
    btnDisabled = true;
  } else if (status === "available") {
    label = pick(
      `發現新版本 ${newVer} — 立即下載`,
      `Update ${newVer} available — Download`
    );
    btnBg = "rgba(0,122,255,0.10)";
    btnColor = "#007aff";
  } else if (status === "downloading") {
    const pct = (update as { status: "downloading"; percent: number }).percent;
    label = pick(`下載中… ${pct}%`, `Downloading… ${pct}%`);
    btnDisabled = true;
  } else if (status === "ready") {
    label = pick(
      `立即重啟安裝 ${newVer}`,
      `Restart & install ${newVer}`
    );
    btnBg = "var(--accent)";
    btnColor = "var(--text-inverted)";
  } else if (status === "up-to-date") {
    label = pick("已是最新版本 ✓", "You're up to date ✓");
    btnBg = "rgba(42,138,92,0.12)";
    btnColor = "var(--success)";
  } else if (status === "error") {
    const msg = (update as { status: "error"; message?: string }).message;
    label = msg ? `錯誤: ${msg}` : pick("無法更新，再試一次", "Update failed — try again");
    btnBg = "var(--danger-soft)";
    btnColor = "var(--danger)";
  } else {
    label = pick("檢查更新", "Check for updates");
  }

  return (
    <div>
      {/* Download progress bar */}
      {status === "downloading" && (
        <div style={{ height: 3, background: "var(--line)", borderRadius: 2, marginBottom: 6 }}>
          <div style={{
            height: "100%",
            width: `${(update as { status: "downloading"; percent: number }).percent}%`,
            background: "var(--accent)",
            borderRadius: 2,
            transition: "width 0.4s var(--ease-standard)",
          }} />
        </div>
      )}

      {/* Primary action button */}
      <button
        onClick={handleClick}
        disabled={btnDisabled}
        style={{
          display: "block", width: "100%",
          background: btnBg, color: btnColor,
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-sm)",
          padding: "6px 10px", textAlign: "left",
          fontSize: 12, cursor: btnDisabled ? "default" : "pointer",
          marginBottom: 4,
          opacity: btnDisabled ? 0.7 : 1,
          transition: "background 0.15s, color 0.15s",
          fontWeight: status === "ready" || status === "available" ? 600 : 400,
        }}
      >
        {label}
      </button>

      {/* Defer button — only shown when ready and not yet deferred */}
      {status === "ready" && !deferred && (
        <button
          onClick={handleDefer}
          style={{
            display: "block", width: "100%",
            background: "none", color: "var(--text-secondary)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-sm)",
            padding: "6px 10px", textAlign: "left",
            fontSize: 12, cursor: "pointer",
            marginBottom: 4,
            transition: "background 0.15s",
          }}
        >
          {pick("下次關閉時安裝", "Install on next quit")}
        </button>
      )}

      {/* Deferred confirmation */}
      {status === "ready" && deferred && (
        <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 4 }}>
          {pick("✓ 關閉時將自動安裝", "✓ Will install on quit")}
        </div>
      )}

      {/* Version line */}
      {version && (
        <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
          {pick("版本", "Version")} {version}
        </div>
      )}
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  position: "fixed",
  top: 62,
  right: 12,
  zIndex: 300,
  background: "var(--surface-1)",
  backdropFilter: "blur(20px) saturate(180%)",
  WebkitBackdropFilter: "blur(20px) saturate(180%)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-lg)",
  padding: "14px 16px",
  width: 248,
  boxShadow: "var(--shadow-overlay)",
  transformOrigin: "top right",
  animation: "gearEnter 260ms var(--ease-spring) forwards",
};

const headerStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 12,
  color: "var(--ink)",
};

const divider: React.CSSProperties = {
  height: 1,
  background: "var(--line)",
  margin: "10px 0",
};

const actionBtn: React.CSSProperties = {
  display: "block",
  width: "100%",
  background: "none",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-sm)",
  padding: "6px 10px",
  textAlign: "left",
  fontSize: 12,
  cursor: "pointer",
  marginBottom: 6,
  color: "var(--ink)",
  transition: "background var(--dur-instant), border-color var(--dur-instant)",
};
