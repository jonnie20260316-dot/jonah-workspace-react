import { useState, useEffect, useRef } from "react";
import type { Block } from "../types";
import { useModalStore } from "../stores/useModalStore";
import { loadJSON, saveJSON } from "../utils/storage";
import { useLang } from "../hooks/useLang";
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

/** Convert stored embed URL to navigable open.spotify.com URL for webview.loadURL() */
function toSpotifyOpenUrl(raw: string): string {
  try {
    if (raw.startsWith("spotify:")) {
      const parts = raw.replace("spotify:", "").split(":");
      if (parts.length >= 2) {
        return `https://open.spotify.com/${parts.join("/")}`;
      }
      return "https://open.spotify.com";
    }
    const u = new URL(raw);
    if (!u.hostname.includes("spotify.com")) return "https://open.spotify.com";
    // Strip /embed/ prefix if present
    const path = u.pathname
      .replace(/^\/embed\//, "/")
      .replace(/^\/intl-[a-z]{2}(-[a-z]{2})?\//i, "/");
    return `https://open.spotify.com${path}`;
  } catch {
    return "https://open.spotify.com";
  }
}

/**
 * Spotify block.
 * - Electron: webview with persist:spotify session — one-time login, remembered.
 * - Browser: iframe embed fallback (no login).
 * Fields: spotify-presets:{blockId}, spotify-ui:{blockId}
 */
export function SpotifyBlock({ block }: SpotifyBlockProps) {
  useLang();
  const isElectron = !!window.electronAPI?.isElectron;
  const { openSpotifyModal, spotifyModal } = useModalStore();
  const webviewRef = useRef<HTMLElement & { loadURL: (url: string) => void }>(null);
  const s = (n: number) => `calc(${n}px * var(--text-scale, 1))`;

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

  const handlePresetClick = (preset: SpotifyPreset) => {
    switchPreset(preset.id);
    if (isElectron && webviewRef.current) {
      webviewRef.current.loadURL(toSpotifyOpenUrl(preset.url));
    }
  };

  const toggleCompact = () => {
    const next = { ...uiState, compact: !uiState.compact };
    setUiState(next);
    saveJSON(`spotify-ui:${block.id}`, next);
  };

  // Tabs bar (shared between Electron and browser modes)
  const tabsBar = (
    <div
      style={{
        display: "flex",
        gap: s(8),
        alignItems: "center",
        padding: s(8),
        backgroundColor: "#f5f5f5",
        borderRadius: "4px",
        overflowX: "auto",
        flexShrink: 0,
      }}
    >
      {presets.map((preset) => (
        <button
          key={preset.id}
          onClick={() => handlePresetClick(preset)}
          style={{
            padding: `${s(6)} ${s(12)}`,
            fontSize: s(12),
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
          padding: `${s(6)} ${s(8)}`,
          fontSize: s(12),
          backgroundColor: "#ddd",
          border: "none",
          borderRadius: "2px",
          cursor: "pointer",
        }}
      >
        + {pick("新增", "Add")}
      </button>
      {!isElectron && presets.length > 0 && (
        <button
          onClick={toggleCompact}
          style={{
            marginLeft: "auto",
            padding: `${s(6)} ${s(8)}`,
            fontSize: s(12),
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
  );

  // Electron mode: full webview with persistent session
  if (isElectron) {
    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        {tabsBar}
        <webview
          ref={webviewRef}
          src="https://open.spotify.com"
          partition="persist:spotify"
          style={{ flex: 1, border: "none", borderRadius: "4px" }}
        />
      </div>
    );
  }

  // Browser mode: iframe embed fallback
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: s(8) }}>
      {tabsBar}
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
              fontSize: s(14),
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
