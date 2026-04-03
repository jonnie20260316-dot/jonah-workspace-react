import { useEffect, useState, useRef } from "react";

interface ToolbarPos {
  top: number;
  left: number;
}

export function RichTextToolbar() {
  const [pos, setPos] = useState<ToolbarPos | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setPos(null);
        return;
      }

      // Only show when selection is inside a .rich-body element
      const range = sel.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const el = container instanceof Element ? container : container.parentElement;
      if (!el?.closest(".rich-body")) {
        setPos(null);
        return;
      }

      const rect = range.getBoundingClientRect();
      if (rect.width === 0) {
        setPos(null);
        return;
      }

      const toolbarW = 120;
      const toolbarH = 34;
      setPos({
        top: rect.top - toolbarH - 8 + window.scrollY,
        left: rect.left + rect.width / 2 - toolbarW / 2 + window.scrollX,
      });
    };

    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      const range = sel.getRangeAt(0);
      const el = range.commonAncestorContainer instanceof Element
        ? range.commonAncestorContainer
        : range.commonAncestorContainer.parentElement;
      if (!el?.closest(".rich-body")) return;

      if (e.key === "b") { e.preventDefault(); document.execCommand("bold"); }
      if (e.key === "i") { e.preventDefault(); document.execCommand("italic"); }
      if (e.key === "h" && e.shiftKey) { e.preventDefault(); applyHeading(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!pos) return null;

  const exec = (cmd: string) => {
    document.execCommand(cmd);
  };

  return (
    <div
      ref={toolbarRef}
      style={{ ...toolbarStyle, top: pos.top, left: pos.left }}
      onMouseDown={(e) => e.preventDefault()} // preserve selection
    >
      <ToolBtn onClick={() => exec("bold")} title="Bold (⌘B)">B</ToolBtn>
      <ToolBtn onClick={() => exec("italic")} title="Italic (⌘I)" italic>I</ToolBtn>
      <ToolBtn onClick={applyHeading} title="Heading (⌘⇧H)">H</ToolBtn>
    </div>
  );
}

function applyHeading() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  const container = range.commonAncestorContainer;
  const el = (container instanceof Element ? container : container.parentElement)?.closest("h1,h2,h3,h4");
  if (el) {
    document.execCommand("formatBlock", false, "p");
  } else {
    document.execCommand("formatBlock", false, "h3");
  }
}

function ToolBtn({ onClick, title, italic, children }: {
  onClick: () => void;
  title: string;
  italic?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      style={{
        background: "none",
        border: "none",
        color: "#fff",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: italic ? 400 : 700,
        fontStyle: italic ? "italic" : "normal",
        padding: "4px 8px",
        borderRadius: 4,
        lineHeight: 1,
        transition: "background 0.12s",
      }}
    >
      {children}
    </button>
  );
}

const toolbarStyle: React.CSSProperties = {
  position: "fixed",
  zIndex: 400,
  background: "rgba(36, 50, 49, 0.92)",
  backdropFilter: "blur(12px) saturate(140%)",
  WebkitBackdropFilter: "blur(12px) saturate(140%)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: "var(--radius-md)" as unknown as number,
  padding: "3px 5px",
  display: "flex",
  gap: 2,
  boxShadow: "var(--shadow-overlay)" as unknown as string,
  pointerEvents: "auto",
  animation: "richToolbarIn var(--dur-fast) var(--ease-enter) forwards",
};
