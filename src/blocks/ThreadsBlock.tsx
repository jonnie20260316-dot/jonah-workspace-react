import { useBlockField } from "../hooks/useBlockField";
import type { Block } from "../types";

interface ThreadsBlockProps {
  block: Block;
}

/**
 * Threads block - thread/conversation tracking.
 * Fields: body (main threads textarea), note (send-note input)
 */
export function ThreadsBlock({ block }: ThreadsBlockProps) {
  const [body, setBody] = useBlockField(block.id, "body", "");
  const [note, setNote] = useBlockField(block.id, "note", "");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Main threads textarea */}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Thread content..."
        style={{
          width: "100%",
          minHeight: "120px",
          padding: "8px",
          border: "1px solid #e0e0e0",
          borderRadius: "4px",
          fontFamily: "inherit",
          fontSize: "14px",
          resize: "vertical",
        }}
      />

      {/* Send note input */}
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Send note..."
        style={{
          padding: "8px",
          border: "1px solid #e0e0e0",
          borderRadius: "4px",
          fontFamily: "inherit",
          fontSize: "14px",
        }}
      />
    </div>
  );
}
