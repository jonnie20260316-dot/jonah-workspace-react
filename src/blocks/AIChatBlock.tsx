import { useState, useEffect } from "react";
import type { Block } from "../types";
import { useLang } from "../hooks/useLang";
import { pick } from "../utils/i18n";
import { loadJSON, saveJSON } from "../utils/storage";

type AIChatTab = "claude" | "chatgpt";

interface AIChatBlockProps {
  block: Block;
}

/**
 * AI Chat block - embedded Claude.ai and ChatGPT via webview.
 * Requires Electron with webviewTag: true and header-stripping for X-Frame-Options.
 * Stores active tab in localStorage at key: ai-chat-tab:{blockId}
 */
export function AIChatBlock({ block }: AIChatBlockProps) {
  useLang();
  const isElectron = !!window.electronAPI?.isElectron;
  const s = (n: number) => `calc(${n}px * var(--text-scale, 1))`;

  const [tab, setTab] = useState<AIChatTab>(() =>
    loadJSON(`ai-chat-tab:${block.id}`, "claude")
  );

  const switchTab = (next: AIChatTab) => {
    setTab(next);
    saveJSON(`ai-chat-tab:${block.id}`, next);
  };

  const src = tab === "claude" ? "https://claude.ai" : "https://chatgpt.com";

  if (!isElectron) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "#999",
          fontSize: s(14),
          padding: "16px",
          textAlign: "center",
        }}
      >
        {pick(
          "此功能需要 Electron 桌面應用程式",
          "This block requires the Electron desktop app"
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: s(8),
          padding: s(8),
          backgroundColor: "#f5f5f5",
          borderRadius: "4px",
          marginBottom: s(8),
        }}
      >
        {(["claude", "chatgpt"] as AIChatTab[]).map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            style={{
              padding: `${s(6)} ${s(12)}`,
              fontSize: s(12),
              backgroundColor: tab === t ? "#5c5cff" : "#ddd",
              color: tab === t ? "#fff" : "#000",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: tab === t ? "600" : "normal",
              transition: "all 0.2s ease",
            }}
          >
            {t === "claude"
              ? pick("Claude 對話", "Claude")
              : pick("ChatGPT 對話", "ChatGPT")}
          </button>
        ))}
      </div>

      {/* Webview container */}
      <div style={{ flex: 1, overflow: "hidden", borderRadius: "4px" }}>
        <webview
          key={tab}
          src={src}
          partition="persist:aichat"
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            border: "none",
          }}
        />
      </div>
    </div>
  );
}
