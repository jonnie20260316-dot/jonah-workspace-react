import { useBlockField } from "../hooks/useBlockField";
import type { Block } from "../types";

interface MetricsBlockProps {
  block: Block;
}

export function MetricsBlock({ block }: MetricsBlockProps) {
  const [notes, setNotes] = useBlockField(block.id, "notes", "");

  const metrics = [
    { label: "記錄連續", value: "07" },
    { label: "完成週數", value: "18" },
    { label: "小勝利", value: "12" },
    { label: "嘗試次數", value: "05" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Metrics grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
        {metrics.map((metric, index) => (
          <div
            key={index}
            style={{
              padding: "12px 8px",
              background: "var(--surface-1)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--line)",
              textAlign: "center",
            }}
          >
            <div style={{
              fontSize: 28,
              fontWeight: 200,
              fontVariantNumeric: "tabular-nums",
              color: "var(--ink)",
              lineHeight: 1.1,
              fontFamily: "var(--font-body)",
            }}>
              {metric.value}
            </div>
            <div style={{
              fontSize: 9,
              color: "var(--text-tertiary)",
              marginTop: 4,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              lineHeight: 1.3,
            }}>
              {metric.label}
            </div>
          </div>
        ))}
      </div>

      {/* Notes */}
      <div>
        <label>備註</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="連結到 OpenClaw 週報、月報、季報"
          rows={4}
        />
      </div>
    </div>
  );
}
