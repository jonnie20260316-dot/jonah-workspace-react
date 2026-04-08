import { useState } from "react";
import type { Block } from "../types";
import { useLang } from "../hooks/useLang";
import { pick } from "../utils/i18n";
import { loadJSON, saveJSON } from "../utils/storage";

type AIChatTab = "claude" | "chatgpt" | "gemini";

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
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: s(8),
          padding: s(8),
          backgroundColor: "#f5f5f5",
          borderRadius: "4px",
          flexShrink: 0,
        }}
      >
        {(["claude", "chatgpt", "gemini"] as AIChatTab[]).map((t) => (
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
              : t === "chatgpt"
              ? pick("ChatGPT 對話", "ChatGPT")
              : pick("Gemini 對話", "Gemini")}
          </button>
        ))}
      </div>

      {/* All webviews rendered, inactive hidden (JW-38: visibility not display) */}
      <div style={{ flex: 1, overflow: "hidden", borderRadius: "4px", display: "flex", position: "relative" }}>
        {([
          { key: "claude",  src: "https://claude.ai" },
          { key: "chatgpt", src: "https://chatgpt.com" },
          { key: "gemini",  src: "https://gemini.google.com" },
        ] as { key: AIChatTab; src: string }[]).map(({ key, src }) => (
          <webview
            key={key}
            src={src}
            partition="persist:aichat"
            style={{
              flex: tab === key ? 1 : undefined,
              border: "none",
              visibility: tab === key ? "visible" : "hidden",
              position: tab === key ? "relative" : "absolute",
              width: tab === key ? undefined : "100%",
              height: tab === key ? undefined : "100%",
              pointerEvents: tab === key ? "auto" : "none",
            }}
          />
        ))}
      </div>
    </div>
  );
}
