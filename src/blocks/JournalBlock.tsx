import { useBlockField } from "../hooks/useBlockField";
import type { Block } from "../types";

interface JournalBlockProps {
  block: Block;
}

/**
 * Journal block - daily reflection with mood, snapshot, wins, and log.
 * Fields: prompt, log-view, mood, snapshot, small-wins, big-wins, body
 */
export function JournalBlock({ block }: JournalBlockProps) {
  const [logView, setLogView] = useBlockField(block.id, "log-view", "Recent 7 days");
  const [mood, setMood] = useBlockField(block.id, "mood", "");
  const [snapshot, setSnapshot] = useBlockField(block.id, "snapshot", "");
  const [smallWins, setSmallWins] = useBlockField(block.id, "small-wins", "");
  const [bigWins, setBigWins] = useBlockField(block.id, "big-wins", "");
  const [body, setBody] = useBlockField(block.id, "body", "");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Top toolbar with view switch */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px",
          backgroundColor: "#f5f5f5",
          borderRadius: "4px",
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
          <button style={{ padding: "4px 8px", fontSize: "calc(12px * var(--text-scale))" }}>
            New prompt
          </button>
          <button style={{ padding: "4px 8px", fontSize: "calc(12px * var(--text-scale))" }}>
            Recent logs
          </button>
          <button style={{ padding: "4px 8px", fontSize: "calc(12px * var(--text-scale))" }}>
            Calendar
          </button>
        </div>
        <select
          value={logView}
          onChange={(e) => setLogView(e.target.value)}
          style={{
            padding: "4px 8px",
            fontSize: "calc(12px * var(--text-scale))",
            borderRadius: "2px",
            border: "1px solid #ccc",
          }}
        >
          <option>Recent 7 days</option>
          <option>Recent 30 days</option>
        </select>
      </div>

      {/* Two-up grid: Mood + Snapshot */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div
          style={{
            padding: "12px",
            backgroundColor: "#fafafa",
            borderRadius: "4px",
          }}
        >
          <label style={{ fontSize: "calc(12px * var(--text-scale))", fontWeight: "500" }}>
            Mood / State
          </label>
          <input
            type="text"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            placeholder="How are you feeling today"
            style={{
              width: "100%",
              marginTop: "4px",
              padding: "6px",
              border: "1px solid #e0e0e0",
              borderRadius: "2px",
              fontFamily: "inherit",
              fontSize: "calc(13px * var(--text-scale))",
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
            One-shot / Snapshot
          </label>
          <input
            type="text"
            value={snapshot}
            onChange={(e) => setSnapshot(e.target.value)}
            placeholder="What should today's snapshot capture?"
            style={{
              width: "100%",
              marginTop: "4px",
              padding: "6px",
              border: "1px solid #e0e0e0",
              borderRadius: "2px",
              fontFamily: "inherit",
              fontSize: "calc(13px * var(--text-scale))",
            }}
          />
        </div>
      </div>

      {/* Two-up grid: Small Wins + Big Wins */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div
          style={{
            padding: "12px",
            backgroundColor: "#fafafa",
            borderRadius: "4px",
          }}
        >
          <label style={{ fontSize: "calc(12px * var(--text-scale))", fontWeight: "500" }}>
            Small wins
          </label>
          <textarea
            value={smallWins}
            onChange={(e) => setSmallWins(e.target.value)}
            placeholder="Small wins from today"
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
            Big wins / Achievements
          </label>
          <textarea
            value={bigWins}
            onChange={(e) => setBigWins(e.target.value)}
            placeholder="Big wins worth remembering"
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

      {/* Main journal body */}
      <div
        style={{
          padding: "12px",
          backgroundColor: "#fafafa",
          borderRadius: "4px",
        }}
      >
        <label style={{ fontSize: "calc(12px * var(--text-scale))", fontWeight: "500" }}>Journal log</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write freely, or begin from the prompt."
          rows={9}
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
  );
}
