import { useState } from "react";
import { useBlockField } from "../hooks/useBlockField";
import { useLang } from "../hooks/useLang";
import { pick } from "../utils/i18n";
import type { Block } from "../types";

interface YouTubeStudioBlockProps {
  block: Block;
}

/**
 * YouTube Studio block — embeds YouTube Studio or a custom URL in an iframe.
 * Falls back to an "Open in Browser" button if iframe is blocked (X-Frame-Options).
 */
export function YouTubeStudioBlock({ block }: YouTubeStudioBlockProps) {
  useLang();
  const [url, setUrl] = useBlockField(block.id, "yt-url", "https://studio.youtube.com");
  const [iframeError, setIframeError] = useState(false);
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlDraft, setUrlDraft] = useState(url);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "8px" }}>
      {/* URL bar */}
      <div style={{ display: "flex", gap: "6px", padding: "6px 8px", alignItems: "center" }}>
        {editingUrl ? (
          <>
            <input
              type="url"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setUrl(urlDraft);
                  setEditingUrl(false);
                  setIframeError(false);
                }
              }}
              style={{
                flex: 1,
                padding: "4px 8px",
                fontSize: "calc(12px * var(--text-scale, 1))",
                border: "1px solid #ddd",
                borderRadius: "4px",
                outline: "none",
              }}
              placeholder="https://studio.youtube.com"
              autoFocus
            />
            <button
              onClick={() => { setUrl(urlDraft); setEditingUrl(false); setIframeError(false); }}
              style={{
                padding: "4px 10px",
                fontSize: "calc(11px * var(--text-scale, 1))",
                backgroundColor: "#4caf50",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              {pick("載入", "Load")}
            </button>
          </>
        ) : (
          <>
            <span
              onClick={() => { setUrlDraft(url); setEditingUrl(true); }}
              style={{
                flex: 1,
                fontSize: "calc(11px * var(--text-scale, 1))",
                color: "#888",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                cursor: "pointer",
              }}
              title={url}
            >
              {url}
            </span>
            <button
              onClick={() => window.open(url, "_blank")}
              style={{
                padding: "4px 8px",
                fontSize: "calc(11px * var(--text-scale, 1))",
                backgroundColor: "#555",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              {pick("開啟瀏覽器", "Open Browser")}
            </button>
          </>
        )}
      </div>

      {/* Iframe or fallback */}
      {iframeError ? (
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          color: "#999",
          fontSize: "calc(13px * var(--text-scale, 1))",
          textAlign: "center",
          padding: "20px",
        }}>
          <div style={{ fontSize: "calc(32px * var(--text-scale, 1))" }}>🚫</div>
          <div>{pick("此網站不允許嵌入", "This site doesn't allow embedding")}</div>
          <button
            onClick={() => window.open(url, "_blank")}
            style={{
              padding: "8px 16px",
              fontSize: "calc(13px * var(--text-scale, 1))",
              backgroundColor: "#ff0000",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            {pick("在瀏覽器中開啟 YouTube Studio", "Open YouTube Studio in Browser")}
          </button>
        </div>
      ) : (
        <iframe
          src={url}
          style={{ flex: 1, border: "none", borderRadius: "8px", minHeight: 0 }}
          allow="camera; microphone; display-capture; fullscreen; autoplay; encrypted-media"
          title="YouTube Studio"
          onError={() => setIframeError(true)}
          onLoad={(e) => {
            // Detect X-Frame-Options block: if contentDocument is null, it's blocked
            try {
              const doc = (e.target as HTMLIFrameElement).contentDocument;
              if (!doc) setIframeError(true);
            } catch {
              // Cross-origin — expected for external sites, iframe is working
            }
          }}
        />
      )}
    </div>
  );
}
