import { useBlockField } from "../hooks/useBlockField";
import type { Block } from "../types";
import { pick } from "../utils/i18n";

interface ContentBlockProps {
  block: Block;
}

/**
 * Content block - titled contenteditable rich text area with draft history.
 * Fields: title, body
 * Extra storage: content-draft-history:{blockId}
 */
export function ContentBlock({ block }: ContentBlockProps) {
  const [title, setTitle] = useBlockField(block.id, "title", "");
  const [body, setBody] = useBlockField(block.id, "body", "");

  const handleBodyChange = (e: React.FormEvent<HTMLDivElement>) => {
    setBody(e.currentTarget.innerHTML);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      {/* Title input */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={pick("這份草稿的目的…", "What is this draft for…")}
        style={{
          padding: "12px",
          fontSize: "calc(14px * var(--text-scale))",
          fontWeight: "500",
          border: "none",
          borderBottom: "1px solid #e0e0e0",
          outline: "none",
          fontFamily: "inherit",
        }}
      />

      {/* Divider */}
      <div style={{ height: "1px", backgroundColor: "#e0e0e0" }} />

      {/* Rich contenteditable body */}
      <div
        contentEditable
        suppressContentEditableWarning
        className="rich-body"
        style={{
          flex: 1,
          minHeight: "200px",
          padding: "12px",
          outline: "none",
          whiteSpace: "pre-wrap",
          wordWrap: "break-word",
          fontSize: "calc(13px * var(--text-scale))",
          lineHeight: "1.5",
        }}
        onBlur={handleBodyChange}
        dangerouslySetInnerHTML={{ __html: body }}
      />

      {/* Draft history placeholder */}
      <div
        style={{
          padding: "8px 12px",
          borderTop: "1px solid #e0e0e0",
          fontSize: "calc(11px * var(--text-scale))",
          backgroundColor: "#fafafa",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        📋 {pick("歷史", "History")}
      </div>
    </div>
  );
}
