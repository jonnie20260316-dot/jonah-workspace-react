import { useState, useEffect } from "react";
import { useModalStore } from "../stores/useModalStore";
import { loadJSON, saveJSON } from "../utils/storage";

/**
 * PromptedNotesModal - Prompted Notes block modal for custom prompts
 * Ports openPromptedNotesModal logic from workspace.html line 5400-5446
 * Two modes: "config" (define prompts) and "entry" (fill responses)
 */

interface PromptField {
  id: string;
  label: string;
  type: "text" | "textarea";
  placeholder?: string;
}

interface PromptedEntry {
  id: string;
  blockId: string;
  date: string;
  timestamp: number;
  fields: Record<string, string>;
}

export function PromptedNotesModal() {
  const { pnModal, closePnModal } = useModalStore();
  const [config, setConfig] = useState<PromptField[]>([]);
  const [entry, setEntry] = useState<PromptedEntry | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<"text" | "textarea">("text");

  useEffect(() => {
    if (!pnModal.open || !pnModal.blockId) return;

    const loadedConfig = loadJSON(`prompted-notes-config:${pnModal.blockId}`, []) as PromptField[];
    setConfig(loadedConfig);

    if (pnModal.mode === "entry" && pnModal.entryId) {
      const entries = loadJSON(`prompted-notes-entries:${pnModal.blockId}`, []) as PromptedEntry[];
      const foundEntry = entries.find((e) => e.id === pnModal.entryId);
      if (foundEntry) {
        setEntry(foundEntry);
        setFieldValues(foundEntry.fields || {});
      } else {
        setEntry(null);
        setFieldValues({});
      }
    } else if (pnModal.mode === "entry") {
      // New entry mode
      setEntry(null);
      setFieldValues({});
    }
  }, [pnModal.open, pnModal.blockId, pnModal.mode, pnModal.entryId]);

  const handleAddField = () => {
    if (!newFieldLabel.trim()) return;

    const newField: PromptField = {
      id: `field-${Date.now()}`,
      label: newFieldLabel.trim(),
      type: newFieldType,
      placeholder: newFieldLabel.trim(),
    };

    setConfig([...config, newField]);
    setNewFieldLabel("");
    setNewFieldType("text");
  };

  const handleRemoveField = (fieldId: string) => {
    setConfig(config.filter((f) => f.id !== fieldId));
  };

  const handleFieldValueChange = (fieldId: string, value: string) => {
    setFieldValues({
      ...fieldValues,
      [fieldId]: value,
    });
  };

  const handleSaveConfig = () => {
    if (!pnModal.blockId) return;

    saveJSON(`prompted-notes-config:${pnModal.blockId}`, config);
    closePnModal();
  };

  const handleSaveEntry = () => {
    if (!pnModal.blockId) return;

    const entries = loadJSON(`prompted-notes-entries:${pnModal.blockId}`, []) as PromptedEntry[];
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];

    if (entry) {
      // Update existing entry
      const idx = entries.findIndex((e) => e.id === entry.id);
      if (idx >= 0) {
        entries[idx].fields = fieldValues;
      }
    } else {
      // Create new entry
      const newEntry: PromptedEntry = {
        id: `entry-${Date.now()}`,
        blockId: pnModal.blockId,
        date: dateStr,
        timestamp: Date.now(),
        fields: fieldValues,
      };
      entries.push(newEntry);
    }

    saveJSON(`prompted-notes-entries:${pnModal.blockId}`, entries);
    closePnModal();
  };

  const handleDeleteEntry = () => {
    if (!entry || !pnModal.blockId) return;

    const entries = loadJSON(`prompted-notes-entries:${pnModal.blockId}`, []) as PromptedEntry[];
    const filtered = entries.filter((e) => e.id !== entry.id);
    saveJSON(`prompted-notes-entries:${pnModal.blockId}`, filtered);
    closePnModal();
  };

  if (!pnModal.open) return null;

  const isConfigMode = pnModal.mode === "config";
  const title = isConfigMode
    ? "設定提問範本"
    : entry
      ? "編輯筆記"
      : "新增筆記";

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
        if (e.target === e.currentTarget) closePnModal();
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
          <h2 style={{ margin: 0, fontSize: "1rem" }}>{title}</h2>
          <button
            onClick={closePnModal}
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

        {isConfigMode ? (
          <>
            <div id="pnConfigList" style={{ marginBottom: "16px" }}>
              {config.map((field, idx) => (
                <div
                  key={field.id}
                  style={{
                    display: "flex",
                    gap: "8px",
                    alignItems: "center",
                    padding: "8px",
                    border: "1px solid #eee",
                    borderRadius: "4px",
                    marginBottom: "8px",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{field.label}</div>
                    <div style={{ fontSize: "0.8rem", color: "#666" }}>
                      {field.type === "text" ? "短文本" : "長文本"}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveField(field.id)}
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

            <div
              style={{
                display: "flex",
                gap: "8px",
                marginBottom: "16px",
                padding: "12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                background: "#f9f9f9",
              }}
            >
              <input
                type="text"
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
                placeholder="欄位名稱"
                style={{
                  flex: 1,
                  padding: "6px 8px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                }}
              />
              <select
                value={newFieldType}
                onChange={(e) => setNewFieldType(e.target.value as "text" | "textarea")}
                style={{
                  padding: "6px 8px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                }}
              >
                <option value="text">短文本</option>
                <option value="textarea">長文本</option>
              </select>
              <button
                onClick={handleAddField}
                style={{
                  padding: "6px 12px",
                  background: "#f0f0f0",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                ＋
              </button>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={closePnModal}
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
                onClick={handleSaveConfig}
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
          </>
        ) : (
          <>
            <div style={{ marginBottom: "16px" }}>
              {config.map((field) => (
                <div key={field.id} style={{ marginBottom: "12px" }}>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 600,
                      marginBottom: "6px",
                      fontSize: "0.9rem",
                    }}
                  >
                    {field.label}
                  </label>
                  {field.type === "textarea" ? (
                    <textarea
                      id={`pnField-${field.id}`}
                      value={fieldValues[field.id] || ""}
                      onChange={(e) => handleFieldValueChange(field.id, e.target.value)}
                      rows={3}
                      placeholder={field.placeholder || field.label}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        boxSizing: "border-box",
                      }}
                    />
                  ) : (
                    <input
                      type="text"
                      id={`pnField-${field.id}`}
                      value={fieldValues[field.id] || ""}
                      onChange={(e) => handleFieldValueChange(field.id, e.target.value)}
                      placeholder={field.placeholder || field.label}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        boxSizing: "border-box",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
                alignItems: "center",
              }}
            >
              {entry && (
                <button
                  onClick={handleDeleteEntry}
                  style={{
                    padding: "8px 16px",
                    background: "#f0f0f0",
                    color: "#c0392b",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    cursor: "pointer",
                    marginRight: "auto",
                  }}
                >
                  刪除
                </button>
              )}
              <button
                onClick={closePnModal}
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
                onClick={handleSaveEntry}
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
          </>
        )}
      </div>
    </div>
  );
}
