import { useBlockField } from "../hooks/useBlockField";
import type { Block } from "../types";

interface KitBlockProps {
  block: Block;
}

/**
 * KIT block - Keep, Improve, Try framework.
 * Fields: keep, improve, try, growth
 */
export function KitBlock({ block }: KitBlockProps) {
  const [keep, setKeep] = useBlockField(block.id, "keep", "");
  const [improve, setImprove] = useBlockField(block.id, "improve", "");
  const [tryField, setTryField] = useBlockField(block.id, "try", "");
  const [growth, setGrowth] = useBlockField(block.id, "growth", "");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Keep / Improve / Try (3-column grid) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "calc(12px * var(--text-scale))", fontWeight: "500" }}>Keep</label>
          <textarea
            value={keep}
            onChange={(e) => setKeep(e.target.value)}
            placeholder="What to keep..."
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
          <label style={{ fontSize: "calc(12px * var(--text-scale))", fontWeight: "500" }}>Improve</label>
          <textarea
            value={improve}
            onChange={(e) => setImprove(e.target.value)}
            placeholder="What to improve..."
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
          <label style={{ fontSize: "calc(12px * var(--text-scale))", fontWeight: "500" }}>Try</label>
          <textarea
            value={tryField}
            onChange={(e) => setTryField(e.target.value)}
            placeholder="What to try..."
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
        <label style={{ fontSize: "calc(12px * var(--text-scale))", fontWeight: "500" }}>Growth Notes</label>
        <textarea
          value={growth}
          onChange={(e) => setGrowth(e.target.value)}
          placeholder="Growth insights..."
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
