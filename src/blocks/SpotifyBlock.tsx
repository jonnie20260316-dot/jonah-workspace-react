import { useState, useEffect } from "react";
import type { Block } from "../types";
import { useModalStore } from "../stores/useModalStore";
import { loadJSON, saveJSON } from "../utils/storage";
import { pick } from "../utils/i18n";

interface SpotifyPreset {
  id: string;
  label: string;
  url: string;
}

interface SpotifyUiState {
  activeId: string | null;
  compact: boolean;
}

interface SpotifyBlockProps {
  block: Block;
}

function toSpotifyEmbedUrl(raw: string): string {
  try {
    // Handle spotify: URI scheme (e.g. spotify:track:4iV5W9uYEdYUVa79Axb7Rh)
    if (raw.startsWith("spotify:")) {
      const parts = raw.replace("spotify:", "").split(":");
      if (parts.length >= 2) {
        return `https://open.spotify.com/embed/${parts.join("/")}?utm_source=generator`;
      }
      return "";
    }

    const u = new URL(raw);
    if (!u.hostname.includes("spotify.com")) return "";
    if (u.pathname.startsWith("/embed/")) return raw;

    // Strip /intl-xx/ prefix from localized URLs
    const path = u.pathname.replace(/^\/intl-[a-z]{2}(-[a-z]{2})?\//i, "/");
    return `https://open.spotify.com/embed${path}?utm_source=generator`;
  } catch {
    return "";
  }
}

/**
 * Spotify block - preset tabs with embedded Spotify iframes.
 * Fields: spotify-presets:{blockId}, spotify-ui:{blockId}
 */
export function SpotifyBlock({ block }: SpotifyBlockProps) {
  const { openSpotifyModal, spotifyModal } = useModalStore();
  const [presets, setPresets] = useState<SpotifyPreset[]>(() =>
    loadJSON(`spotify-presets:${block.id}`, [])
  );
  const [uiState, setUiState] = useState<SpotifyUiState>(() =>
    loadJSON(`spotify-ui:${block.id}`, { activeId: null, compact: false })
  );

  // Refresh presets when Spotify modal closes
  useEffect(() => {
    if (!spotifyModal.open) {
      setPresets(loadJSON(`spotify-presets:${block.id}`, []));
    }
  }, [spotifyModal.open, block.id]);

  const activeId = uiState.activeId || presets[0]?.id || null;
  const active = presets.find((p) => p.id === activeId) || presets[0] || null;
  const compact = uiState.compact;

  const switchPreset = (id: string) => {
    const next = { ...uiState, activeId: id };
    setUiState(next);
    saveJSON(`spotify-ui:${block.id}`, next);
  };

  const toggleCompact = () => {
    const next = { ...uiState, compact: !uiState.compact };
    setUiState(next);
    saveJSON(`spotify-ui:${block.id}`, next);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Preset tabs bar */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          alignItems: "center",
          padding: "8px",
          backgroundColor: "#f5f5f5",
          borderRadius: "4px",
          overflowX: "auto",
        }}
      >
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => switchPreset(preset.id)}
            style={{
              padding: "6px 12px",
              fontSize: "calc(12px * var(--text-scale))",
              backgroundColor: preset.id === activeId ? "#1DB954" : "#ddd",
              color: preset.id === activeId ? "#fff" : "#000",
              border: "none",
              borderRadius: "2px",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {preset.label}
          </button>
        ))}
        <button
          onClick={() => openSpotifyModal(block.id)}
          style={{
            padding: "6px 8px",
            fontSize: "calc(12px * var(--text-scale))",
            backgroundColor: "#ddd",
            border: "none",
            borderRadius: "2px",
            cursor: "pointer",
          }}
        >
          + Add
        </button>
        {presets.length > 0 && (
          <button
            onClick={toggleCompact}
            style={{
              marginLeft: "auto",
              padding: "6px 8px",
              fontSize: "calc(12px * var(--text-scale))",
              backgroundColor: compact ? "#333" : "#ddd",
              color: compact ? "#fff" : "#000",
              border: "none",
              borderRadius: "2px",
              cursor: "pointer",
            }}
          >
            {compact ? "\u2922" : "\u2921"}
          </button>
        )}
      </div>

      {/* Spotify content */}
      <div
        style={{
          backgroundColor: "#f5f5f5",
          borderRadius: "4px",
          overflow: "hidden",
        }}
      >
        {!active ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "200px",
              color: "#999",
              fontSize: "calc(14px * var(--text-scale))",
            }}
          >
            {pick("點擊「＋新增」貼上 Spotify 連結", "Click '+ Add' to paste a Spotify link")}
          </div>
        ) : (
          <iframe
            key={active.id}
            src={toSpotifyEmbedUrl(active.url)}
            width="100%"
            height={compact ? 152 : 352}
            frameBorder={0}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            style={{ borderRadius: "12px", display: "block" }}
          />
        )}
      </div>
    </div>
  );
}
