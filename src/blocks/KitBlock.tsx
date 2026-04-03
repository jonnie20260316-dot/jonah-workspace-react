import { useBlockField } from "../hooks/useBlockField";
import { useLang } from "../hooks/useLang";
import type { Block } from "../types";
import { pick } from "../utils/i18n";

interface KitBlockProps {
  block: Block;
}

/**
 * KIT block - Keep, Improve, Try framework.
 * Fields: keep, improve, try, growth
 */
export function KitBlock({ block }: KitBlockProps) {
  useLang();
  const [keep, setKeep] = useBlockField(block.id, "keep", "");
  const [improve, setImprove] = useBlockField(block.id, "improve", "");
  const [tryField, setTryField] = useBlockField(block.id, "try", "");
  const [growth, setGrowth] = useBlockField(block.id, "growth", "");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Keep / Improve / Try (3-column grid) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "calc(12px * var(--text-scale))", fontWeight: "500" }}>{pick("保留", "Keep")}</label>
          <textarea
            value={keep}
            onChange={(e) => setKeep(e.target.value)}
            placeholder={pick("什麼值得保留…", "What to keep...")}
            style={{
              padding: "8px",
              border: "1px solid #e0e0e0",
              borderRadius: "4px",
              fontFamily: "inherit",
              fontSize: "calc(14px * var(--text-scale))",
              minHeight: "100px",
              resize: "vertical",
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "calc(12px * var(--text-scale))", fontWeight: "500" }}>{pick("改進", "Improve")}</label>
          <textarea
            value={improve}
            onChange={(e) => setImprove(e.target.value)}
            placeholder={pick("什麼需要改進…", "What to improve...")}
            style={{
              padding: "8px",
              border: "1px solid #e0e0e0",
              borderRadius: "4px",
              fontFamily: "inherit",
              fontSize: "calc(14px * var(--text-scale))",
              minHeight: "100px",
              resize: "vertical",
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "calc(12px * var(--text-scale))", fontWeight: "500" }}>{pick("嘗試", "Try")}</label>
          <textarea
            value={tryField}
            onChange={(e) => setTryField(e.target.value)}
            placeholder={pick("想嘗試什麼…", "What to try...")}
            style={{
              padding: "8px",
              border: "1px solid #e0e0e0",
              borderRadius: "4px",
              fontFamily: "inherit",
              fontSize: "calc(14px * var(--text-scale))",
              minHeight: "100px",
              resize: "vertical",
            }}
          />
        </div>
      </div>

      {/* Growth (full width) */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <label style={{ fontSize: "calc(12px * var(--text-scale))", fontWeight: "500" }}>{pick("成長筆記", "Growth Notes")}</label>
        <textarea
          value={growth}
          onChange={(e) => setGrowth(e.target.value)}
          placeholder={pick("成長洞察…", "Growth insights...")}
          style={{
            padding: "8px",
            border: "1px solid #e0e0e0",
            borderRadius: "4px",
            fontFamily: "inherit",
            fontSize: "calc(14px * var(--text-scale))",
            minHeight: "80px",
            resize: "vertical",
          }}
        />
      </div>
    </div>
  );
}
