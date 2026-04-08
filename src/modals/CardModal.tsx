import { useState, useEffect } from "react";
import { useModalStore } from "../stores/useModalStore";
import { useProjectStore } from "../stores/useProjectStore";

/**
 * CardModal - Projects block modal for editing task cards
 * Ports renderCardModal logic from workspace.html line 3960-3997
 */

const CARD_TAGS = [
  { id: "urgent", label: "急", color: "#e74c3c" },
  { id: "blocked", label: "卡", color: "#f39c12" },
  { id: "review", label: "審", color: "#3498db" },
];

export function CardModal() {
  const { cardModal, closeCardModal } = useModalStore();
  const [cardTitle, setCardTitle] = useState("");
  const [cardDesc, setCardDesc] = useState("");
  const [steps, setSteps] = useState<string[]>([]);
  const [checks, setChecks] = useState<Set<number>>(new Set());
  const [newStepInput, setNewStepInput] = useState("");
  const [tags, setTags] = useState<Set<string>>(new Set());

  // Load card data from Zustand store when modal opens
  useEffect(() => {
    if (!cardModal.open || !cardModal.cardId) return;

    const board = useProjectStore.getState().projectBoard;
    const allCards = [...board.queue, ...board.doing, ...board.archive];
    const card = allCards.find((c) => c.id === cardModal.cardId);

    const updateFromCard = () => {
      if (card) {
        setCardTitle(card.text || "");
        setCardDesc(card.description || "");
        setSteps(card.steps || []);

        const checkedSet = new Set<number>();
        if (card.checks) {
          card.checks.split(",").forEach((val: string) => {
            const num = Number(val);
            if (!isNaN(num)) checkedSet.add(num);
          });
        }
        setChecks(checkedSet);

        setTags(new Set<string>(card.tags || []));
      }
    };
    updateFromCard();
  }, [cardModal.open, cardModal.cardId]);

  const handleSave = () => {
    if (!cardModal.cardId) return;

    // Update card through Zustand store (persists to localStorage automatically)
    useProjectStore.getState().updateCard(cardModal.cardId, {
      text: cardTitle,
      description: cardDesc,
      steps,
      checks: Array.from(checks).join(","),
      tags: Array.from(tags),
    });
    closeCardModal();
  };

  const handleAddStep = () => {
    if (newStepInput.trim()) {
      setSteps([...steps, newStepInput.trim()]);
      setNewStepInput("");
    }
  };

  const handleDeleteStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
    setChecks((prev) => {
      const updated = new Set(prev);
      updated.delete(index);
      // Adjust indices after delete
      const newChecks = new Set<number>();
      updated.forEach((i) => {
        if (i > index) newChecks.add(i - 1);
        else if (i < index) newChecks.add(i);
      });
      return newChecks;
    });
  };

  const handleStepEdit = (index: number, newText: string) => {
    const updated = [...steps];
    updated[index] = newText;
    setSteps(updated);
  };

  const handleCheckStep = (index: number, checked: boolean) => {
    setChecks((prev) => {
      const updated = new Set(prev);
      if (checked) {
        updated.add(index);
      } else {
        updated.delete(index);
      }
      return updated;
    });
  };

  const handleTagToggle = (tagId: string) => {
    setTags((prev) => {
      const updated = new Set(prev);
      if (updated.has(tagId)) {
        updated.delete(tagId);
      } else {
        updated.add(tagId);
      }
      return updated;
    });
  };

  if (!cardModal.open) return null;

  const checkedCount = Array.from(checks).filter((i) => i < steps.length).length;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeCardModal();
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "8px",
          padding: "24px",
          maxWidth: "500px",
          width: "90%",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ margin: 0 }}>編輯任務卡</h2>
          <button
            onClick={closeCardModal}
            style={{
              background: "none",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        <label style={{ display: "block", fontWeight: 600, marginBottom: "8px" }}>標題</label>
        <input
          type="text"
          value={cardTitle}
          onChange={(e) => setCardTitle(e.target.value)}
          placeholder="任務名稱…"
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            marginBottom: "16px",
            boxSizing: "border-box",
          }}
        />

        <label style={{ display: "block", fontWeight: 600, marginBottom: "8px" }}>描述</label>
        <textarea
          value={cardDesc}
          onChange={(e) => setCardDesc(e.target.value)}
          placeholder="補充細節…"
          rows={3}
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            marginBottom: "16px",
            boxSizing: "border-box",
          }}
        />

        <label style={{ display: "block", fontWeight: 600, marginBottom: "8px" }}>步驟</label>
        <div style={{ marginBottom: "12px" }}>
          {steps.length > 0 && (
            <div style={{ marginBottom: "12px" }}>
              {steps.map((step, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: "8px",
                    alignItems: "center",
                    padding: "8px",
                    border: "1px solid #eee",
                    borderRadius: "4px",
                    marginBottom: "8px",
                    backgroundColor: checks.has(i) ? "#f0f0f0" : "transparent",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checks.has(i)}
                    onChange={(e) => handleCheckStep(i, e.target.checked)}
                  />
                  <input
                    type="text"
                    value={step}
                    onChange={(e) => handleStepEdit(i, e.target.value)}
                    style={{
                      flex: 1,
                      padding: "4px 8px",
                      border: "none",
                      background: "transparent",
                    }}
                  />
                  <button
                    onClick={() => handleDeleteStep(i)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#999",
                      cursor: "pointer",
                      fontSize: "16px",
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {steps.length > 0 && (
            <div style={{ fontSize: "12px", color: "#666", marginBottom: "12px" }}>
              {checkedCount}/{steps.length} 完成
            </div>
          )}
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              value={newStepInput}
              onChange={(e) => setNewStepInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddStep();
              }}
              placeholder="＋ 新增步驟"
              style={{
                flex: 1,
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
              }}
            />
            <button
              onClick={handleAddStep}
              style={{
                padding: "8px 16px",
                background: "#f0f0f0",
                border: "1px solid #ddd",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Add
            </button>
          </div>
        </div>

        <label style={{ display: "block", fontWeight: 600, marginBottom: "8px" }}>標籤</label>
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          {CARD_TAGS.map((tag) => (
            <button
              key={tag.id}
              onClick={() => handleTagToggle(tag.id)}
              style={{
                padding: "6px 12px",
                background: tags.has(tag.id) ? tag.color : "#f0f0f0",
                color: tags.has(tag.id) ? "white" : "#333",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              {tag.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <button
            onClick={closeCardModal}
            style={{
              padding: "8px 16px",
              background: "#f0f0f0",
              border: "1px solid #ddd",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: "8px 16px",
              background: "#007AFF",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            儲存
          </button>
        </div>
      </div>
    </div>
  );
}
