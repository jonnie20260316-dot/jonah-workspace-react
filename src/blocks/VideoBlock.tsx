import { useBlockField } from "../hooks/useBlockField";
import type { Block } from "../types";

interface VideoBlockProps {
  block: Block;
}

/**
 * Video block - video capture purpose and import path notes.
 * Fields: purpose, path
 */
export function VideoBlock({ block }: VideoBlockProps) {
  const [purpose, setPurpose] = useBlockField(block.id, "purpose", "", { global: true });
  const [path, setPath] = useBlockField(block.id, "path", "", { global: true });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Info card with chips */}
      <div
        style={{
          padding: "12px",
          backgroundColor: "#f5f5f5",
          borderRadius: "4px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", gap: "6px" }}>
          <span
            style={{
              padding: "4px 8px",
              backgroundColor: "#e0e0e0",
              borderRadius: "2px",
              fontSize: "calc(11px * var(--text-scale))",
            }}
          >
            Record self
          </span>
          <span
            style={{
              padding: "4px 8px",
              backgroundColor: "#e0e0e0",
              borderRadius: "2px",
              fontSize: "calc(11px * var(--text-scale))",
            }}
          >
            Workflow capture
          </span>
          <span
            style={{
              padding: "4px 8px",
              backgroundColor: "#e0e0e0",
              borderRadius: "2px",
              fontSize: "calc(11px * var(--text-scale))",
            }}
          >
            iPhone webcam later
          </span>
        </div>
        <p style={{ fontSize: "calc(12px * var(--text-scale))", color: "#666", margin: "0" }}>
          Continuity Camera is Apple-ID-bound, so this starts as a capture hub
          and import area until we solve the cross-Apple-ID iPhone webcam path.
        </p>
      </div>

      {/* Two-up grid: Purpose + Path */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div
          style={{
            padding: "12px",
            backgroundColor: "#fafafa",
            borderRadius: "4px",
          }}
        >
          <label style={{ fontSize: "calc(12px * var(--text-scale))", fontWeight: "500" }}>
            Capture purpose
          </label>
          <textarea
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="What is this capture meant to record today?"
            rows={5}
            style={{
              width: "100%",
              marginTop: "4px",
              padding: "6px",
              border: "1px solid #e0e0e0",
              borderRadius: "2px",
              fontFamily: "inherit",
              fontSize: "calc(13px * var(--text-scale))",
              resize: "vertical",
            }}
          />
        </div>
        <div
          style={{
            padding: "12px",
            backgroundColor: "#fafafa",
            borderRadius: "4px",
          }}
        >
          <label style={{ fontSize: "calc(12px * var(--text-scale))", fontWeight: "500" }}>
            Import / device path
          </label>
          <textarea
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="For example: iPhone transfer, shared folder, OBS, Camo-style tooling."
            rows={5}
            style={{
              width: "100%",
              marginTop: "4px",
              padding: "6px",
              border: "1px solid #e0e0e0",
              borderRadius: "2px",
              fontFamily: "inherit",
              fontSize: "calc(13px * var(--text-scale))",
              resize: "vertical",
            }}
          />
        </div>
      </div>
    </div>
  );
}
