import { useRef, useEffect, useCallback, type ChangeEvent } from "react";
import { useBlockField } from "../hooks/useBlockField";
import { pick } from "../utils/i18n";
import { useLang } from "../hooks/useLang";
import { Camera, Upload, Trash2, Clipboard } from "lucide-react";
import type { Block } from "../types";

interface Props {
  block: Block;
}

/**
 * Screenshot block — paste or upload images for quick reference.
 * Stores image as base64 data URL in global block field "image".
 * Caption stored separately in "caption".
 */
export function ScreenshotBlock({ block }: Props) {
  useLang();
  const [image, setImage] = useBlockField(block.id, "image", "", { global: true });
  const [caption, setCaption] = useBlockField(block.id, "caption", "", { global: true });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const s = (n: number) => `calc(${n}px * var(--text-scale, 1))`;

  const processFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      // Limit: 5MB to avoid localStorage quota issues
      if (file.size > 5 * 1024 * 1024) {
        alert(pick("圖片太大（上限 5MB）", "Image too large (max 5MB)"));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    },
    [setImage]
  );

  // Listen for paste events when block is focused
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) processFile(blob);
          return;
        }
      }
    };

    wrapper.addEventListener("paste", onPaste);
    return () => wrapper.removeEventListener("paste", onPaste);
  }, [processFile]);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset so same file can be selected again
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleClear = () => {
    setImage("");
    setCaption("");
  };

  return (
    <div
      ref={wrapperRef}
      tabIndex={0}
      className="screenshot-wrapper"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        outline: "none",
      }}
    >
      {image ? (
        <>
          {/* Image display */}
          <div style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            background: "rgba(0,0,0,0.02)",
            borderRadius: 4,
            minHeight: 0,
          }}>
            <img
              src={image}
              alt={caption || pick("截圖", "Screenshot")}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                borderRadius: 4,
              }}
            />
          </div>

          {/* Caption + actions */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 0 0",
            flexShrink: 0,
          }}>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={pick("標題…", "Caption…")}
              style={{
                flex: 1,
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-sm)",
                padding: `${s(4)} ${s(8)}`,
                fontSize: s(12),
                background: "rgba(255,255,255,0.8)",
                outline: "none",
                fontFamily: "inherit",
                color: "var(--ink)",
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              title={pick("更換圖片", "Replace image")}
              style={iconBtnStyle}
            >
              <Upload size={13} />
            </button>
            <button
              onClick={handleClear}
              title={pick("清除", "Clear")}
              style={{ ...iconBtnStyle, color: "#e45" }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </>
      ) : (
        /* Empty state */
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            border: "2px dashed var(--line)",
            borderRadius: 8,
            cursor: "pointer",
            padding: 20,
            color: "var(--text-tertiary)",
            transition: "border-color var(--dur-fast), background var(--dur-fast)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--accent)";
            e.currentTarget.style.background = "rgba(79,156,249,0.03)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--line)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          <Camera size={32} strokeWidth={1.5} />
          <div style={{ fontSize: s(13), fontWeight: 500, color: "var(--text-secondary)" }}>
            {pick("點擊上傳或貼上截圖", "Click to upload or paste a screenshot")}
          </div>
          <div style={{ fontSize: s(11), display: "flex", alignItems: "center", gap: 6 }}>
            <Clipboard size={12} />
            {pick("支援拖曳與 Cmd+V 貼上", "Supports drag & drop and Cmd+V paste")}
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        style={{ display: "none" }}
      />
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-sm)",
  background: "none",
  cursor: "pointer",
  color: "var(--text-secondary)",
  flexShrink: 0,
};
