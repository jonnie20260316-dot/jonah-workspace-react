import { useState, useEffect } from "react";
import { useModalStore } from "../stores/useModalStore";
import { loadJSON, saveJSON } from "../utils/storage";

/**
 * SpotifyPresetModal - Spotify block modal for preset management
 * Ports openSpotifyPresetModal logic from workspace.html line 4526-4550
 */

interface SpotifyPreset {
  id: string;
  label: string;
  url: string;
}

const toSpotifyEmbedUrl = (rawUrl: string): string => {
  // Convert spotify.com link to embed URL if needed
  if (!rawUrl) return "";
  if (rawUrl.includes("/embed/")) return rawUrl;
  if (rawUrl.includes("spotify.com/playlist/")) {
    const match = rawUrl.match(/playlist\/([a-zA-Z0-9]+)/);
    if (match) {
      return `https://open.spotify.com/embed/playlist/${match[1]}`;
    }
  }
  return rawUrl;
};

export function SpotifyPresetModal() {
  const { spotifyModal, closeSpotifyModal } = useModalStore();
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [preset, setPreset] = useState<SpotifyPreset | null>(null);

  useEffect(() => {
    if (!spotifyModal.open || !spotifyModal.blockId) return;

    const presets = loadJSON(`spotify-presets:${spotifyModal.blockId}`, []) as SpotifyPreset[];
    const updateFromPreset = () => {
      if (spotifyModal.presetId) {
        const found = presets.find((p) => p.id === spotifyModal.presetId);
        if (found) {
          setPreset(found);
          setLabel(found.label);
          setUrl(found.url);
        }
      } else {
        setPreset(null);
        setLabel("");
        setUrl("");
      }
    };
    updateFromPreset();
  }, [spotifyModal.open, spotifyModal.blockId, spotifyModal.presetId]);

  const handleSave = () => {
    if (!spotifyModal.blockId || !label.trim() || !url.trim()) return;

    const presets = loadJSON(`spotify-presets:${spotifyModal.blockId}`, []) as SpotifyPreset[];
    const embedUrl = toSpotifyEmbedUrl(url.trim());

    if (preset) {
      // Update existing
      const idx = presets.findIndex((p) => p.id === preset.id);
      if (idx >= 0) {
        presets[idx].label = label;
        presets[idx].url = embedUrl;
      }
    } else {
      // Create new
      const newPreset: SpotifyPreset = {
        id: `sp-${Date.now()}`,
        label,
        url: embedUrl,
      };
      presets.push(newPreset);
    }

    saveJSON(`spotify-presets:${spotifyModal.blockId}`, presets);
    closeSpotifyModal();
  };

  const handleDelete = () => {
    if (!preset || !spotifyModal.blockId) return;

    const presets = loadJSON(`spotify-presets:${spotifyModal.blockId}`, []) as SpotifyPreset[];
    const filtered = presets.filter((p) => p.id !== preset.id);
    saveJSON(`spotify-presets:${spotifyModal.blockId}`, filtered);
    closeSpotifyModal();
  };

  if (!spotifyModal.open) return null;

  const isEdit = !!preset;
  const title = isEdit ? "編輯播放清單" : "新增播放清單";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeSpotifyModal();
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "8px",
          maxWidth: "420px",
          width: "90%",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 24px",
            borderBottom: "1px solid #eee",
          }}
        >
          <span style={{ fontWeight: 600 }}>{title}</span>
          <button
            onClick={closeSpotifyModal}
            style={{
              background: "none",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "16px" }}>
          <label style={{ display: "block" }}>
            <div style={{ fontWeight: 600, marginBottom: "6px", fontSize: "0.9rem" }}>名稱</div>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="例：工作、休息、學習"
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                boxSizing: "border-box",
              }}
            />
          </label>

          <label style={{ display: "block" }}>
            <div style={{ fontWeight: 600, marginBottom: "6px", fontSize: "0.9rem" }}>Spotify 連結</div>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://open.spotify.com/playlist/..."
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                boxSizing: "border-box",
              }}
            />
          </label>

          <div style={{ fontSize: "0.85rem", color: "#666" }}>
            可貼入任何 Spotify 連結，自動轉換為嵌入格式
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "12px",
            padding: "16px",
            borderTop: "1px solid #eee",
            justifyContent: "flex-end",
          }}
        >
          {isEdit && (
            <button
              onClick={handleDelete}
              style={{
                padding: "8px 16px",
                background: "#f0f0f0",
                color: "#c0392b",
                border: "1px solid #ddd",
                borderRadius: "4px",
                cursor: "pointer",
                marginRight: "auto",
              }}
            >
              刪除
            </button>
          )}
          <button
            onClick={closeSpotifyModal}
            style={{
              padding: "8px 16px",
              background: "#f0f0f0",
              border: "1px solid #ddd",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: "8px 16px",
              background: "#007AFF",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            儲存
          </button>
        </div>
      </div>
    </div>
  );
}
