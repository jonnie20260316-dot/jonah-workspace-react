import { useEffect, useRef, useState } from "react";
import type { Block } from "../types";
import { pick } from "../utils/i18n";
import { useLang } from "../hooks/useLang";
import { useBlockField } from "../hooks/useBlockField";

interface SpotifyBlockProps {
  block: Block;
}

function toEmbedUrl(raw: string): string {
  try {
    if (raw.startsWith("spotify:")) {
      const parts = raw.replace("spotify:", "").split(":");
      if (parts.length >= 2) return `https://open.spotify.com/embed/${parts.join("/")}`;
      return "";
    }
    const u = new URL(raw);
    if (!u.hostname.includes("spotify.com")) return "";
    const path = u.pathname
      .replace(/^\/embed\//, "/")
      .replace(/^\/intl-[a-z]{2}(-[a-z]{2})?\//i, "/");
    return `https://open.spotify.com/embed${path}?utm_source=generator`;
  } catch {
    return "";
  }
}

function toDirectUrl(raw: string): string {
  try {
    if (raw.startsWith("spotify:")) {
      const parts = raw.replace("spotify:", "").split(":");
      if (parts.length >= 2) return `https://open.spotify.com/${parts.join("/")}`;
      return "";
    }
    const u = new URL(raw);
    if (!u.hostname.includes("spotify.com")) return "";
    const path = u.pathname
      .replace(/^\/embed\//, "/")
      .replace(/^\/intl-[a-z]{2}(-[a-z]{2})?\//i, "/");
    return `https://open.spotify.com${path}`;
  } catch {
    return "";
  }
}

const FOOTER_H = 30;

export function SpotifyBlock({ block }: SpotifyBlockProps) {
  useLang();
  const isElectron = !!window.electronAPI?.isElectron;
  const [url, setUrl] = useBlockField(block.id, "embed-url", "", { global: true });
  const [input, setInput] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const lastBoundsKey = useRef("");

  // Track block position and keep WebContentsView aligned
  useEffect(() => {
    if (!isElectron || !url) return;
    const directUrl = toDirectUrl(url);
    if (!directUrl) return;

    let frameId: number;
    const sync = () => {
      const el = containerRef.current;
      if (el) {
        const r = el.getBoundingClientRect();
        const bounds = {
          x: Math.round(r.x),
          y: Math.round(r.y),
          width: Math.round(r.width),
          height: Math.max(0, Math.round(r.height - FOOTER_H)),
        };
        const key = `${bounds.x},${bounds.y},${bounds.width},${bounds.height}`;
        if (key !== lastBoundsKey.current) {
          lastBoundsKey.current = key;
          window.electronAPI!.spotifyAttach(directUrl, bounds);
        }
      }
      frameId = requestAnimationFrame(sync);
    };
    frameId = requestAnimationFrame(sync);
    return () => {
      cancelAnimationFrame(frameId);
      window.electronAPI!.spotifyDetach();
    };
  }, [isElectron, url]);

  // After login popup closes, reload WebContentsView to playlist URL
  useEffect(() => {
    if (!isElectron || !window.electronAPI?.onSpotifyLoginDone) return;
    return window.electronAPI.onSpotifyLoginDone(() => {
      if (url) window.electronAPI!.spotifyReload(toDirectUrl(url));
    });
  }, [isElectron, url]);

  const embedUrl = toEmbedUrl(url);

  if (embedUrl) {
    if (isElectron) {
      return (
        <div ref={containerRef} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          {/* Spacer — WebContentsView renders over this area */}
          <div style={{ flex: 1 }} />
          {/* Footer — sits below WebContentsView bounds */}
          <div style={{ height: FOOTER_H, padding: "0 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              onClick={() => window.electronAPI!.spotifyOpenLogin()}
              style={{ fontSize: "11px", color: "#1DB954", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
            >
              {pick("登入 Spotify", "Log in")}
            </button>
            <button
              onClick={() => setUrl("")}
              style={{ fontSize: "11px", color: "#aaa", background: "none", border: "none", cursor: "pointer" }}
            >
              {pick("更換", "Change")}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <iframe
          src={embedUrl}
          style={{ flex: 1, width: "100%", border: "none" }}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
        <div style={{ padding: "4px 8px", display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={() => setUrl("")}
            style={{ fontSize: "11px", color: "#aaa", background: "none", border: "none", cursor: "pointer" }}
          >
            {pick("更換", "Change")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "12px", padding: "16px" }}>
      <svg width="36" height="36" viewBox="0 0 168 168">
        <circle cx="84" cy="84" r="84" fill="#1DB954" />
        <path d="M120 113c-2 3-6 4-9 2-25-15-57-19-94-10-4 1-7-1-8-5s1-7 5-8c41-9 76-5 104 12 3 2 4 6 2 9zm10-26c-2 3-7 5-10 2-29-18-73-23-107-13-4 1-9-1-10-6s1-9 6-10c39-11 87-6 120 15 4 2 5 7 1 12zm1-27c-35-21-93-23-127-13-5 1-10-2-11-7s2-10 7-11c39-11 103-9 143 15 4 3 6 9 3 13-3 5-9 6-15 3z" fill="white" />
      </svg>
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder={pick("貼上 Spotify 播放清單連結", "Paste Spotify playlist URL")}
        style={{ width: "100%", maxWidth: "280px", padding: "8px 12px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "13px" }}
        onKeyDown={e => { if (e.key === "Enter" && toEmbedUrl(input)) setUrl(input); }}
      />
      <button
        onClick={() => { if (toEmbedUrl(input)) setUrl(input); }}
        disabled={!toEmbedUrl(input)}
        style={{ padding: "8px 20px", backgroundColor: "#1DB954", color: "#fff", border: "none", borderRadius: "20px", cursor: "pointer", fontSize: "13px", fontWeight: 600, opacity: toEmbedUrl(input) ? 1 : 0.4 }}
      >
        {pick("載入", "Load")}
      </button>
    </div>
  );
}
