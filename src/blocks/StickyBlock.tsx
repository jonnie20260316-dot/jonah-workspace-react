import { useBlockField } from "../hooks/useBlockField";
import type { Block } from "../types";

interface StickyBlockProps {
  block: Block;
}

/**
 * Sticky block - simple contenteditable rich text area.
 * Single field: body
 */
export function StickyBlock({ block }: StickyBlockProps) {
  const [body, setBody] = useBlockField(block.id, "body", "");

  const handleChange = (e: React.FormEvent<HTMLDivElement>) => {
    setBody(e.currentTarget.innerHTML);
  };

  return (
    <div
      contentEditable
      suppressContentEditableWarning
      className="sticky-area rich-body"
      style={{
        minHeight: "100%",
        outline: "none",
        whiteSpace: "pre-wrap",
        wordWrap: "break-word",
      }}
      onBlur={handleChange}
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
}
