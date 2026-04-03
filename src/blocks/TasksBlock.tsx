import { useState } from "react";
import { useBlockField } from "../hooks/useBlockField";
import type { Block } from "../types";

interface TasksBlockProps {
  block: Block;
}

/**
 * Individual task card — extracted as a proper component so hooks
 * are called at top level (not inside .map()).
 */
function TaskCard({
  blockId,
  index,
  defaultTitle,
}: {
  blockId: string;
  index: number;
  defaultTitle: string;
}) {
  const [isDone, setIsDone] = useBlockField(blockId, `task:${index}:done`, "");
  const [title, setTitle] = useBlockField(blockId, `task:${index}:title`, "");
  const [steps, setSteps] = useBlockField(blockId, `task:${index}:steps`, "");
  const [checks, setChecks] = useBlockField(blockId, `task:${index}:checks`, "");
  const [newStep, setNewStep] = useState("");

  const stepList = steps
    .split("\n")
    .filter((s) => s.trim());

  const checkedSet = new Set<number>(
    checks
      ? checks.split(",").map(Number).filter((n) => !isNaN(n))
      : []
  );

  const toggleCheck = (i: number) => {
    const next = new Set(checkedSet);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setChecks(Array.from(next).join(","));
  };

  const addStep = () => {
    const trimmed = newStep.trim();
    if (!trimmed) return;
    const updated = steps ? steps + "\n" + trimmed : trimmed;
    setSteps(updated);
    setNewStep("");
  };

  const deleteStep = (i: number) => {
    const updated = stepList.filter((_, idx) => idx !== i).join("\n");
    setSteps(updated);
    // Adjust checks: remove index, shift higher indices down
    const next = new Set<number>();
    for (const c of checkedSet) {
      if (c < i) next.add(c);
      else if (c > i) next.add(c - 1);
      // c === i is removed
    }
    setChecks(Array.from(next).join(","));
  };

  const done = isDone === "true";

  return (
    <div
      style={{
        padding: "12px",
        backgroundColor: done ? "#e8f5e9" : "#fafafa",
        borderRadius: "4px",
        opacity: done ? 0.6 : 1,
      }}
    >
      <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
        <input
          type="checkbox"
          checked={done}
          onChange={(e) => setIsDone(e.target.checked ? "true" : "")}
          style={{ marginTop: "4px" }}
        />
        <div style={{ flex: 1 }}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={defaultTitle}
            style={{
              width: "100%",
              padding: "4px",
              border: "1px solid #e0e0e0",
              borderRadius: "2px",
              fontWeight: "500",
              fontSize: "13px",
              textDecoration: done ? "line-through" : "none",
            }}
          />

          {/* Step checklist */}
          {stepList.length > 0 && (
            <div style={{ marginTop: "8px", fontSize: "12px" }}>
              <div style={{ marginBottom: "4px", color: "#666" }}>
                {checkedSet.size}/{stepList.length} steps
              </div>
              {stepList.map((step, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "3px 4px",
                    backgroundColor: "#fff",
                    marginBottom: "2px",
                    borderRadius: "2px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checkedSet.has(i)}
                    onChange={() => toggleCheck(i)}
                    style={{ flexShrink: 0 }}
                  />
                  <span
                    style={{
                      flex: 1,
                      textDecoration: checkedSet.has(i) ? "line-through" : "none",
                      color: checkedSet.has(i) ? "#999" : "#333",
                      wordBreak: "break-word",
                    }}
                  >
                    {step}
                  </span>
                  <button
                    onClick={() => deleteStep(i)}
                    style={{
                      padding: "0 4px",
                      fontSize: "11px",
                      color: "#999",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                    title="Delete step"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add step input */}
          <div style={{ display: "flex", gap: "4px", marginTop: "6px" }}>
            <input
              type="text"
              value={newStep}
              onChange={(e) => setNewStep(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addStep(); }}
              placeholder="Add step…"
              style={{
                flex: 1,
                padding: "4px",
                border: "1px solid #e0e0e0",
                borderRadius: "2px",
                fontSize: "12px",
              }}
            />
            <button
              onClick={addStep}
              style={{
                padding: "4px 8px",
                fontSize: "12px",
                backgroundColor: "#ddd",
                border: "none",
                borderRadius: "2px",
                cursor: "pointer",
              }}
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Tasks block - 6 task cards with step checklists.
 * Fields: view, task:0-5:done, task:0-5:title, task:0-5:steps, task:0-5:checks, workflow-notes
 */
export function TasksBlock({ block }: TasksBlockProps) {
  const [view, setView] = useBlockField(block.id, "view", "cards");
  const [workflowNotes, setWorkflowNotes] = useBlockField(
    block.id,
    "workflow-notes",
    ""
  );

  const tasks = [
    { index: 0, title: "Journal" },
    { index: 1, title: "KIT" },
    { index: 2, title: "Main push" },
    { index: 3, title: "Client / Offer" },
    { index: 4, title: "System / AI" },
    { index: 5, title: "Study / Stretch" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* View toggle */}
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
          <button
            onClick={() => setView("cards")}
            style={{
              padding: "4px 8px",
              fontSize: "12px",
              backgroundColor: view === "cards" ? "#333" : "#ddd",
              color: view === "cards" ? "#fff" : "#000",
              borderRadius: "2px",
              cursor: "pointer",
              border: "none",
            }}
          >
            Cards
          </button>
          <button
            onClick={() => setView("list")}
            style={{
              padding: "4px 8px",
              fontSize: "12px",
              backgroundColor: view === "list" ? "#333" : "#ddd",
              color: view === "list" ? "#fff" : "#000",
              borderRadius: "2px",
              cursor: "pointer",
              border: "none",
            }}
          >
            List
          </button>
        </div>
        <span style={{ fontSize: "11px", color: "#666" }}>
          2 fixed + 4 flexible
        </span>
      </div>

      {/* Task cards */}
      <div
        style={{
          display: view === "cards" ? "grid" : "flex",
          gridTemplateColumns: view === "cards" ? "1fr 1fr" : undefined,
          flexDirection: view === "list" ? "column" : undefined,
          gap: "8px",
        }}
      >
        {tasks.map((t) => (
          <TaskCard
            key={t.index}
            blockId={block.id}
            index={t.index}
            defaultTitle={t.title}
          />
        ))}
      </div>

      {/* Workflow notes */}
      <div
        style={{
          padding: "12px",
          backgroundColor: "#fafafa",
          borderRadius: "4px",
        }}
      >
        <label style={{ fontSize: "12px", fontWeight: "500" }}>
          Workflow observation / How I worked today
        </label>
        <textarea
          value={workflowNotes}
          onChange={(e) => setWorkflowNotes(e.target.value)}
          placeholder="Capture what felt smooth, slow, or worth improving later."
          rows={5}
          style={{
            width: "100%",
            marginTop: "4px",
            padding: "6px",
            border: "1px solid #e0e0e0",
            borderRadius: "2px",
            fontFamily: "inherit",
            fontSize: "13px",
            resize: "vertical",
          }}
        />
      </div>
    </div>
  );
}
