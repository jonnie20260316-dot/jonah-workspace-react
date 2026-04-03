import { useState, useRef } from "react";
import type { Block } from "../types";
import { useModalStore } from "../stores/useModalStore";
import { useProjectStore, type ProjectCard, type ProjectBoard } from "../stores/useProjectStore";
import { pick } from "../utils/i18n";

interface ProjectsBlockProps {
  block: Block;
}

/**
 * Projects block - Kanban-style board with queue/doing/archive columns.
 * Reads from global projectBoard store. Supports native HTML5 drag-drop.
 */
export function ProjectsBlock({ block }: ProjectsBlockProps) {
  const { openCardModal } = useModalStore();
  const { projectBoard, addCard, moveCard } = useProjectStore();
  const dragCardRef = useRef<{ cardId: string; fromCol: keyof ProjectBoard } | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const COLUMNS: { key: keyof ProjectBoard; label: string; microcopy: string }[] = [
    { key: "queue", label: pick("待辦", "Queue"), microcopy: pick("像 PM 看板一樣拖動卡片。", "Drag cards around like a PM board.") },
    { key: "doing", label: pick("進行中", "Doing"), microcopy: pick("拖到這裡標為進行中。", "Drop here to move to active.") },
    { key: "archive", label: pick("封存", "Archive"), microcopy: pick("拖到這裡封存。", "Drop here to archive it.") },
  ];

  const handleAddCard = (column: keyof ProjectBoard) => {
    const card: ProjectCard = {
      id: crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2),
      text: pick("新卡片", "New card"),
      description: "",
      steps: [],
      checks: "",
      tags: [],
    };
    addCard(column, card);
  };

  const handleDragStart = (cardId: string, fromCol: keyof ProjectBoard) => {
    dragCardRef.current = { cardId, fromCol };
  };

  const handleDragOver = (e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    setDragOverCol(colKey);
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = (toCol: keyof ProjectBoard) => {
    setDragOverCol(null);
    if (!dragCardRef.current) return;
    const { cardId, fromCol } = dragCardRef.current;
    dragCardRef.current = null;
    moveCard(cardId, fromCol, toCol);
  };

  const renderCard = (card: ProjectCard, colKey: keyof ProjectBoard) => {
    const stepsCount = card.steps?.length || 0;
    const checkedCount = card.checks
      ? card.checks.split(",").filter((v) => v.trim()).length
      : 0;

    return (
      <div
        key={card.id}
        draggable
        onDragStart={() => handleDragStart(card.id, colKey)}
        onDragEnd={() => { dragCardRef.current = null; setDragOverCol(null); }}
        onClick={() => openCardModal(card.id, block.id)}
        style={{
          padding: 10,
          background: "var(--surface-0)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-sm)",
          cursor: "grab",
          marginBottom: 6,
          boxShadow: "var(--shadow-raised)",
          transition: "box-shadow var(--dur-fast) var(--ease-standard)",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-float)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-raised)"; }}
      >
        <p style={{ margin: "0 0 4px", fontSize: "calc(13px * var(--text-scale))", fontWeight: "500" }}>
          {card.text}
        </p>
        {stepsCount > 0 && (
          <div style={{ fontSize: "calc(11px * var(--text-scale))", color: "#666", marginBottom: "4px" }}>
            {checkedCount}/{stepsCount} steps
          </div>
        )}
        {card.tags && card.tags.length > 0 && (
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            {card.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  padding: "2px 6px",
                  backgroundColor: "#e0e0e0",
                  borderRadius: "2px",
                  fontSize: "calc(10px * var(--text-scale))",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "16px",
      }}
    >
      {COLUMNS.map((column) => (
        <div key={column.key}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <h4 style={{ margin: "0", fontSize: "calc(14px * var(--text-scale))" }}>
              {column.label}
              <span style={{ fontSize: "calc(11px * var(--text-scale))", color: "#999", marginLeft: "6px" }}>
                {projectBoard[column.key].length}
              </span>
            </h4>
            <button
              onClick={() => handleAddCard(column.key)}
              style={{
                padding: "4px 8px",
                fontSize: "calc(12px * var(--text-scale))",
                backgroundColor: "#ddd",
                border: "none",
                borderRadius: "2px",
                cursor: "pointer",
              }}
            >
              +
            </button>
          </div>

          <div
            onDragOver={(e) => handleDragOver(e, column.key)}
            onDragLeave={handleDragLeave}
            onDrop={() => handleDrop(column.key)}
            style={{
              minHeight: 200,
              padding: 8,
              background: "var(--surface-1)",
              borderRadius: "var(--radius-sm)",
              border: `2px dashed ${dragOverCol === column.key ? "var(--accent)" : "var(--line)"}`,
              outline: dragOverCol === column.key ? "2px dashed var(--accent)" : "none",
              outlineOffset: -2,
              transition: "border-color var(--dur-fast), background var(--dur-fast)",
            }}
          >
            {projectBoard[column.key].map((card) =>
              renderCard(card, column.key)
            )}
          </div>

          <p
            style={{
              fontSize: "calc(11px * var(--text-scale))",
              color: "#999",
              margin: "6px 0 0",
            }}
          >
            {column.microcopy}
          </p>
        </div>
      ))}
    </div>
  );
}
