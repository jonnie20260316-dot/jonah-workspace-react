import { useRef } from "react";
import { useBlockField } from "../hooks/useBlockField";
import type { Block } from "../types";
import { pick } from "../utils/i18n";

interface IntelBlockProps {
  block: Block;
}

/**
 * Intel block - morning intel, trend, and hook analysis.
 * Fields: intel, trend, hook, source
 */
export function IntelBlock({ block }: IntelBlockProps) {
  const [intel, setIntel] = useBlockField(block.id, "intel", "");
  const [trend, setTrend] = useBlockField(block.id, "trend", "");
  const [hook, setHook] = useBlockField(block.id, "hook", "");
  const [source, setSource] = useBlockField(
    block.id,
    "source",
    "Loaded defaults"
  );

  const intelFileRef = useRef<HTMLInputElement>(null);
  const trendFileRef = useRef<HTMLInputElement>(null);

  const handleLoadDefaults = () => {
    setIntel("今日市場情報：\n• 主要趨勢觀察\n• 競品動態\n• 受眾反饋摘要");
    setHook("今日切入點：從受眾最常見的痛點出發，找到引起共鳴的角度。");
    setTrend("趨勢觀察：留意平台演算法偏好的內容格式變化，短影片互動率持續上升。");
    setSource("defaults");
  };

  const handleImportFile = (
    setter: (v: string) => void,
    label: string
  ) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        setter(reader.result as string);
        setSource(`Imported ${label}: ${file.name}`);
      };
      reader.readAsText(file);
      e.target.value = "";
    };
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Top toolbar with action buttons */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          padding: "8px",
          backgroundColor: "#f5f5f5",
          borderRadius: "4px",
        }}
      >
        <button
          onClick={handleLoadDefaults}
          style={{
            padding: "4px 8px",
            fontSize: "calc(12px * var(--text-scale))",
            backgroundColor: "#333",
            color: "#fff",
            border: "none",
            borderRadius: "2px",
            cursor: "pointer",
          }}
        >
          {pick("載入預設", "Load defaults")}
        </button>
        <button
          onClick={() => intelFileRef.current?.click()}
          style={{
            padding: "4px 8px",
            fontSize: "calc(12px * var(--text-scale))",
            backgroundColor: "#ddd",
            color: "#000",
            border: "none",
            borderRadius: "2px",
            cursor: "pointer",
          }}
        >
          {pick("匯入情報", "Import intel")}
        </button>
        <button
          onClick={() => trendFileRef.current?.click()}
          style={{
            padding: "4px 8px",
            fontSize: "calc(12px * var(--text-scale))",
            backgroundColor: "#ddd",
            color: "#000",
            border: "none",
            borderRadius: "2px",
            cursor: "pointer",
          }}
        >
          {pick("匯入趨勢", "Import trend")}
        </button>
        <input ref={intelFileRef} type="file" accept=".txt,.md" style={{ display: "none" }} onChange={handleImportFile(setIntel, "intel")} />
        <input ref={trendFileRef} type="file" accept=".txt,.md" style={{ display: "none" }} onChange={handleImportFile(setTrend, "trend")} />
      </div>

      {/* Source note + Intel textarea */}
      <div
        style={{
          padding: "12px",
          backgroundColor: "#fafafa",
          borderRadius: "4px",
        }}
      >
        <div style={{ fontSize: "calc(11px * var(--text-scale))", color: "#666", marginBottom: "8px" }}>
          {source}
        </div>
        <label style={{ fontSize: "calc(12px * var(--text-scale))", fontWeight: "500" }}>Intel</label>
        <textarea
          value={intel}
          onChange={(e) => setIntel(e.target.value)}
          placeholder={pick("早晨情報", "Morning intelligence")}
          rows={8}
          style={{
            width: "100%",
            marginTop: "4px",
            padding: "6px",
            border: "1px solid #e0e0e0",
            borderRadius: "2px",
            fontFamily: "inherit",
            fontSize: "calc(13px * var(--text-scale))",
            resize: "vertical",
          }}
        />
      </div>

      {/* Two-up: Hook + Trend */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div
          style={{
            padding: "12px",
            backgroundColor: "#fafafa",
            borderRadius: "4px",
          }}
        >
          <label style={{ fontSize: "calc(12px * var(--text-scale))", fontWeight: "500" }}>
            {pick("今日鉤子", "Hook of the day")}
          </label>
          <textarea
            value={hook}
            onChange={(e) => setHook(e.target.value)}
            placeholder={pick("今天的鉤子…", "Today's hook")}
            rows={7}
            style={{
              width: "100%",
              marginTop: "4px",
              padding: "6px",
              border: "1px solid #e0e0e0",
              borderRadius: "2px",
              fontFamily: "inherit",
              fontSize: "calc(13px * var(--text-scale))",
              resize: "vertical",
            }}
          />
        </div>
        <div
          style={{
            padding: "12px",
            backgroundColor: "#fafafa",
            borderRadius: "4px",
          }}
        >
          <label style={{ fontSize: "calc(12px * var(--text-scale))", fontWeight: "500" }}>
            {pick("趨勢角度", "Trend angle")}
          </label>
          <textarea
            value={trend}
            onChange={(e) => setTrend(e.target.value)}
            placeholder={pick("趨勢洞察…", "Trend insight")}
            rows={7}
            style={{
              width: "100%",
              marginTop: "4px",
              padding: "6px",
              border: "1px solid #e0e0e0",
              borderRadius: "2px",
              fontFamily: "inherit",
              fontSize: "calc(13px * var(--text-scale))",
              resize: "vertical",
            }}
          />
        </div>
      </div>
    </div>
  );
}
