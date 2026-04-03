import { useBlockField } from "../hooks/useBlockField";
import type { Block } from "../types";
import { pick } from "../utils/i18n";

interface IntentionBlockProps {
  block: Block;
}

/**
 * Intention block - goal setting and theme tracking.
 * Fields: goal, next, theme
 */
export function IntentionBlock({ block }: IntentionBlockProps) {
  const [goal, setGoal] = useBlockField(block.id, "goal", "");
  const [next, setNext] = useBlockField(block.id, "next", "");
  const [theme, setTheme] = useBlockField(block.id, "theme", "");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Goal */}
      <textarea
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        placeholder={pick("今天的目標？", "What's the goal?")}
        style={{
          width: "100%",
          minHeight: "80px",
          padding: "8px",
          border: "1px solid #e0e0e0",
          borderRadius: "4px",
          fontFamily: "inherit",
          fontSize: "calc(14px * var(--text-scale))",
        }}
      />

      {/* Next + Theme (2-up grid) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <input
          type="text"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder={pick("下一步？", "Next step?")}
          style={{
            padding: "8px",
            border: "1px solid #e0e0e0",
            borderRadius: "4px",
            fontFamily: "inherit",
            fontSize: "calc(14px * var(--text-scale))",
          }}
        />
        <input
          type="text"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          placeholder={pick("主題", "Theme")}
          style={{
            padding: "8px",
            border: "1px solid #e0e0e0",
            borderRadius: "4px",
            fontFamily: "inherit",
            fontSize: "calc(14px * var(--text-scale))",
          }}
        />
      </div>
    </div>
  );
}
