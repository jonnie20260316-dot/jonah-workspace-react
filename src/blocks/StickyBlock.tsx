import { useRef, useEffect, useCallback } from "react";
import { useBlockField } from "../hooks/useBlockField";
import type { Block } from "../types";

interface StickyBlockProps {
  block: Block;
}

/**
 * Sticky block — rich contenteditable note.
 *
 * Title: stored in block.label (editable via BlockShell header).
 * Shown as a heading at the top of the body area when set.
 *
 * Ref pattern (not dangerouslySetInnerHTML):
 * React never writes to the contenteditable DOM directly after mount.
 * We initialise innerHTML once and only overwrite from external storage
 * changes when the user is NOT focused — preventing re-render rewrites
 * from erasing typed content.
 *
 * Data-safety guards:
 * - onInput saves to localStorage on every keystroke
 * - handleBlur checks isConnected before saving (prevents save-on-unmount
 *   from writing empty string over saved content)
 *
 * "---" shortcut: Enter on a line with exactly "---" inserts an <hr>.
 */
export function StickyBlock({ block }: StickyBlockProps) {
  const [body, setBody] = useBlockField(block.id, "body", "", { global: true });

  const bodyRef = useRef<HTMLDivElement>(null);
  const isFocusedRef = useRef(false);

  // Initialise DOM content on mount. After that, only update from external
  // storage changes (e.g. cross-device sync) when the user is not focused.
  useEffect(() => {
    if (!isFocusedRef.current && bodyRef.current) {
      bodyRef.current.innerHTML = body;
    }
  }, [body]);

  const handleFocus = useCallback(() => {
    isFocusedRef.current = true;
  }, []);

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      isFocusedRef.current = false;
      // Only save when element is still in the document.
      // If React is unmounting, the node may be detached and innerHTML
      // would be empty — saving would permanently wipe the content.
      if (e.currentTarget.isConnected) {
        setBody(e.currentTarget.innerHTML);
      }
    },
    [setBody]
  );

  // Real-time save on every keystroke — content is in localStorage before
  // any re-render can overwrite it.
  const handleInput = useCallback(() => {
    if (bodyRef.current) {
      setBody(bodyRef.current.innerHTML);
    }
  }, [setBody]);

  // "---" → <hr> shortcut on Enter.
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== "Enter") return;

      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;

      const range = sel.getRangeAt(0);
      let node: Node | null = range.startContainer;
      while (node && node.parentNode !== bodyRef.current) {
        node = node.parentNode;
      }
      if (!node) return;

      const text =
        node.nodeType === Node.TEXT_NODE
          ? node.textContent ?? ""
          : (node as Element).textContent ?? "";

      if (text.trim() !== "---") return;

      e.preventDefault();

      const hr = document.createElement("hr");
      const newLine = document.createElement("div");
      newLine.appendChild(document.createElement("br"));

      const parent = bodyRef.current!;
      parent.replaceChild(hr, node);
      hr.insertAdjacentElement("afterend", newLine);

      const newRange = document.createRange();
      newRange.setStart(newLine, 0);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);

      setBody(parent.innerHTML);
    },
    [setBody]
  );

  return (
    <div className="sticky-wrapper">
      {block.label && (
        <div className="sticky-body-title">{block.label}</div>
      )}
      <div
        ref={bodyRef}
        contentEditable
        suppressContentEditableWarning
        className="sticky-area rich-body"
        style={{ outline: "none", whiteSpace: "pre-wrap", wordWrap: "break-word" }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}
