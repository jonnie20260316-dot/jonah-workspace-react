import { useBlockField } from "../hooks/useBlockField";
import type { Block } from "../types";

interface SwipeBlockProps {
  block: Block;
}

/**
 * Swipe block - two-mode hook research and library tracking.
 * Run mode: topic/audience/tone/goal inputs, /hl brief, result parsing
 * Library mode: chosen history, post URL, verdict, metrics, outcome payload
 * Fields: hook-mode, topic, audience, tone, goal, platform, constraints, brief, result-raw, outcome-post-url, outcome-verdict, outcome-metrics, outcome-payload, body
 */
export function SwipeBlock({ block }: SwipeBlockProps) {
  const [mode, setMode] = useBlockField(block.id, "hook-mode", "run");
  const [topic, setTopic] = useBlockField(block.id, "topic", "");
  const [audience, setAudience] = useBlockField(block.id, "audience", "");
  const [tone, setTone] = useBlockField(block.id, "tone", "");
  const [goal, setGoal] = useBlockField(block.id, "goal", "");
  const [brief, setBrief] = useBlockField(block.id, "brief", "");
  const [resultRaw, setResultRaw] = useBlockField(block.id, "result-raw", "");
  const [postUrl, setPostUrl] = useBlockField(
    block.id,
    "outcome-post-url",
    ""
  );
  const [verdict, setVerdict] = useBlockField(
    block.id,
    "outcome-verdict",
    ""
  );
  const [metrics, setMetrics] = useBlockField(
    block.id,
    "outcome-metrics",
    ""
  );
  const [payload, setPayload] = useBlockField(
    block.id,
    "outcome-payload",
    ""
  );
  const [referenceNotes, setReferenceNotes] = useBlockField(
    block.id,
    "body",
    ""
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Mode tabs */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          padding: "8px",
          backgroundColor: "#f5f5f5",
          borderRadius: "4px",
          alignItems: "center",
        }}
      >
        <button
          onClick={() => setMode("run")}
          style={{
            padding: "6px 12px",
            fontSize: "calc(12px * var(--text-scale))",
            backgroundColor: mode === "run" ? "#333" : "#ddd",
            color: mode === "run" ? "#fff" : "#000",
            border: "none",
            borderRadius: "2px",
            cursor: "pointer",
          }}
        >
          Run
        </button>
        <button
          onClick={() => setMode("library")}
          style={{
            padding: "6px 12px",
            fontSize: "calc(12px * var(--text-scale))",
            backgroundColor: mode === "library" ? "#333" : "#ddd",
            color: mode === "library" ? "#fff" : "#000",
            border: "none",
            borderRadius: "2px",
            cursor: "pointer",
          }}
        >
          Library
        </button>
        <span style={{ marginLeft: "auto", fontSize: "calc(11px * var(--text-scale))", color: "#666" }}>
          /hl · Threads · local-first
        </span>
      </div>

      {/* Run Mode */}
      {mode === "run" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "calc(12px * var(--text-scale))", fontWeight: "500" }}>Topic</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What is this post really about?"
                style={{
                  width: "100%",
                  marginTop: "4px",
                  padding: "6px",
                  border: "1px solid #e0e0e0",
                  borderRadius: "2px",
                  fontSize: "calc(13px * var(--text-scale))",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: "calc(12px * var(--text-scale))", fontWeight: "500" }}>Audience</label>
              <input
                type="text"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="Who should stop and read first?"
                style={{
                  width: "100%",
                  marginTop: "4px",
                  padding: "6px",
                  border: "1px solid #e0e0e0",
                  borderRadius: "2px",
                  fontSize: "calc(13px * var(--text-scale))",
                }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "calc(12px * var(--text-scale))", fontWeight: "500" }}>Tone</label>
              <input
                type="text"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="For example: direct, calm, insightful"
                style={{
                  width: "100%",
                  marginTop: "4px",
                  padding: "6px",
                  border: "1px solid #e0e0e0",
                  borderRadius: "2px",
                  fontSize: "calc(13px * var(--text-scale))",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: "calc(12px * var(--text-scale))", fontWeight: "500" }}>Goal</label>
              <input
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="What should this opening make people do?"
                style={{
                  width: "100%",
                  marginTop: "4px",
                  padding: "6px",
                  border: "1px solid #e0e0e0",
                  borderRadius: "2px",
                  fontSize: "calc(13px * var(--text-scale))",
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "calc(12px * var(--text-scale))", fontWeight: "500" }}>/hl Brief</label>
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="Press Generate /hl Brief and the prompt will appear here."
              rows={6}
              style={{
                width: "100%",
                marginTop: "4px",
                padding: "6px",
                border: "1px solid #e0e0e0",
                borderRadius: "2px",
                fontSize: "calc(13px * var(--text-scale))",
                resize: "vertical",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              padding: "8px",
              backgroundColor: "#f5f5f5",
              borderRadius: "2px",
            }}
          >
            <button
              style={{
                padding: "4px 8px",
                fontSize: "calc(12px * var(--text-scale))",
                backgroundColor: "#333",
                color: "#fff",
                border: "none",
                borderRadius: "2px",
                cursor: "pointer",
              }}
            >
              Generate /hl Brief
            </button>
            <button
              style={{
                padding: "4px 8px",
                fontSize: "calc(12px * var(--text-scale))",
                backgroundColor: "#ddd",
                color: "#000",
                border: "none",
                borderRadius: "2px",
                cursor: "pointer",
              }}
            >
              Paste /hl Result
            </button>
          </div>

          <div>
            <label style={{ fontSize: "calc(12px * var(--text-scale))", fontWeight: "500" }}>/hl Result</label>
            <textarea
              value={resultRaw}
              onChange={(e) => setResultRaw(e.target.value)}
              placeholder="Paste the `/hl` reply here"
              rows={6}
              style={{
                width: "100%",
                marginTop: "4px",
                padding: "6px",
                border: "1px solid #e0e0e0",
                borderRadius: "2px",
                fontSize: "calc(13px * var(--text-scale))",
                resize: "vertical",
              }}
            />
          </div>
        </div>
      )}

      {/* Library Mode */}
      {mode === "library" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "calc(12px * var(--text-scale))", fontWeight: "500" }}>Post URL</label>
              <input
                type="text"
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
                placeholder="https://..."
                style={{
                  width: "100%",
                  marginTop: "4px",
                  padding: "6px",
                  border: "1px solid #e0e0e0",
                  borderRadius: "2px",
                  fontSize: "calc(13px * var(--text-scale))",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: "calc(12px * var(--text-scale))", fontWeight: "500" }}>Manual verdict</label>
              <input
                type="text"
                value={verdict}
                onChange={(e) => setVerdict(e.target.value)}
                placeholder="For example: posted, strong, weak"
                style={{
                  width: "100%",
                  marginTop: "4px",
                  padding: "6px",
                  border: "1px solid #e0e0e0",
                  borderRadius: "2px",
                  fontSize: "calc(13px * var(--text-scale))",
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "calc(12px * var(--text-scale))", fontWeight: "500" }}>Light metrics</label>
            <textarea
              value={metrics}
              onChange={(e) => setMetrics(e.target.value)}
              placeholder='{"likes": 0, "replies": 0, "notes": ""}'
              rows={4}
              style={{
                width: "100%",
                marginTop: "4px",
                padding: "6px",
                border: "1px solid #e0e0e0",
                borderRadius: "2px",
                fontSize: "calc(13px * var(--text-scale))",
                resize: "vertical",
              }}
            />
          </div>

          <button
            style={{
              padding: "6px 12px",
              fontSize: "calc(12px * var(--text-scale))",
              backgroundColor: "#333",
              color: "#fff",
              border: "none",
              borderRadius: "2px",
              cursor: "pointer",
            }}
          >
            Log Outcome
          </button>

          <div>
            <label style={{ fontSize: "calc(12px * var(--text-scale))", fontWeight: "500" }}>Outcome Payload</label>
            <textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              placeholder="The outcome log payload will appear here."
              rows={5}
              style={{
                width: "100%",
                marginTop: "4px",
                padding: "6px",
                border: "1px solid #e0e0e0",
                borderRadius: "2px",
                fontSize: "calc(13px * var(--text-scale))",
                resize: "vertical",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: "calc(12px * var(--text-scale))", fontWeight: "500" }}>Reference Notes</label>
            <textarea
              value={referenceNotes}
              onChange={(e) => setReferenceNotes(e.target.value)}
              placeholder="Keep swipe notes, references, and structures worth stealing."
              rows={4}
              style={{
                width: "100%",
                marginTop: "4px",
                padding: "6px",
                border: "1px solid #e0e0e0",
                borderRadius: "2px",
                fontSize: "calc(13px * var(--text-scale))",
                resize: "vertical",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
