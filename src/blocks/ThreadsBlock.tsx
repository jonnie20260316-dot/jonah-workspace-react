import { useBlockField } from "../hooks/useBlockField";
import { useLang } from "../hooks/useLang";
import type { Block } from "../types";
import { pick } from "../utils/i18n";

interface ThreadsBlockProps {
  block: Block;
}

/**
 * Threads block - thread/conversation tracking.
 * Fields: body (main threads textarea), note (send-note input)
 */
export function ThreadsBlock({ block }: ThreadsBlockProps) {
  useLang();
  const [body, setBody] = useBlockField(block.id, "body", "", { global: true });
  const [note, setNote] = useBlockField(block.id, "note", "", { global: true });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Main threads textarea */}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={pick("內容…", "Thread content...")}
        style={{
          width: "100%",
          minHeight: "120px",
          padding: "8px",
          border: "1px solid #e0e0e0",
          borderRadius: "4px",
          fontFamily: "inherit",
          fontSize: "calc(14px * var(--text-scale))",
          resize: "vertical",
        }}
      />

      {/* Send note input */}
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={pick("傳送備注…", "Send note...")}
        style={{
          padding: "8px",
          border: "1px solid #e0e0e0",
          borderRadius: "4px",
          fontFamily: "inherit",
          fontSize: "calc(14px * var(--text-scale))",
        }}
      />
    </div>
  );
}
