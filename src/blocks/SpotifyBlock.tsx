import { useEffect, useRef } from "react";
import type { Block } from "../types";
import { pick } from "../utils/i18n";
import { useLang } from "../hooks/useLang";

interface SpotifyBlockProps {
  block: Block;
}

/**
 * Spotify block.
 * - Electron: WebContentsView overlaid exactly over this block (unsandboxed,
 *   plugins:true, persist:spotify). rAF loop keeps bounds in sync on pan/zoom/resize.
 * - Browser: button opens open.spotify.com in a new tab.
 */
export function SpotifyBlock({ block }: SpotifyBlockProps) {
  useLang();
  const isElectron = !!window.electronAPI?.isElectron;
  const containerRef = useRef<HTMLDivElement>(null);

  // Create WebContentsView on mount, destroy on unmount
  useEffect(() => {
    if (!isElectron) return;
    const el = containerRef.current;
    if (!el) return;

    let rafId: number;
    let created = false;
    let last = { x: -1, y: -1, width: -1, height: -1 };

    const getBounds = () => {
      const r = el.getBoundingClientRect();
      return {
        x: Math.round(r.x),
        y: Math.round(r.y),
        width: Math.round(r.width),
        height: Math.round(r.height),
      };
    };

    const tick = () => {
      if (created) {
        const b = getBounds();
        if (b.x !== last.x || b.y !== last.y || b.width !== last.width || b.height !== last.height) {
          last = b;
          window.electronAPI?.spotifySetBounds(b);
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    window.electronAPI?.spotifyCreate(getBounds()).then(() => {
      created = true;
      rafId = requestAnimationFrame(tick);
    });

    return () => {
      cancelAnimationFrame(rafId);
      window.electronAPI?.spotifyDestroy();
    };
  }, [isElectron]);

  // Hide WebContentsView when block is collapsed
  useEffect(() => {
    if (!isElectron) return;
    window.electronAPI?.spotifySetVisible(!block.collapsed);
  }, [block.collapsed, isElectron]);

  if (!isElectron) {
    return (
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <svg width="48" height="48" viewBox="0 0 168 168">
          <circle cx="84" cy="84" r="84" fill="#1DB954" />
          <path
            d="M120 113c-2 3-6 4-9 2-25-15-57-19-94-10-4 1-7-1-8-5s1-7 5-8c41-9 76-5 104 12 3 2 4 6 2 9zm10-26c-2 3-7 5-10 2-29-18-73-23-107-13-4 1-9-1-10-6s1-9 6-10c39-11 87-6 120 15 4 2 5 7 1 12zm1-27c-35-21-93-23-127-13-5 1-10-2-11-7s2-10 7-11c39-11 103-9 143 15 4 3 6 9 3 13-3 5-9 6-15 3z"
            fill="white"
          />
        </svg>
        <button
          onClick={() => window.open("https://open.spotify.com", "_blank")}
          style={{
            padding: "10px 28px",
            fontSize: "14px",
            fontWeight: 600,
            backgroundColor: "#1DB954",
            color: "#fff",
            border: "none",
            borderRadius: "24px",
            cursor: "pointer",
          }}
        >
          {pick("開啟 Spotify", "Open Spotify")}
        </button>
      </div>
    );
  }

  // Electron: transparent placeholder — actual content is the WebContentsView overlay
  return <div ref={containerRef} style={{ flex: 1, minHeight: 0, minWidth: 0 }} />;
}
