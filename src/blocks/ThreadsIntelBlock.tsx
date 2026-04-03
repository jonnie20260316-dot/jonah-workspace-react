import { useState, useEffect, useRef, useMemo } from "react";
import type { Block } from "../types";
import { useModalStore } from "../stores/useModalStore";
import { loadJSON, saveJSON } from "../utils/storage";

interface TiRecord {
  id: string;
  date: string;
  account: string;
  painTags: string[];
  analysis: string;
  comment: string;
  blindspot: string;
  followUp?: string;
  [key: string]: unknown;
}

interface ThreadsIntelBlockProps {
  block: Block;
}

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Threads Intel block - account analysis with today/history/stats tabs.
 * Reads global: threads-intel-records, threads-intel-archived
 */
export function ThreadsIntelBlock({ block }: ThreadsIntelBlockProps) {
  const { openTiModal, tiModal } = useModalStore();
  const [tab, setTab] = useState<"today" | "history" | "stats">("today");
  const [records, setRecords] = useState<TiRecord[]>(() =>
    loadJSON("threads-intel-records", [])
  );
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refresh records when TI modal closes
  useEffect(() => {
    if (!tiModal.open) {
      setRecords(loadJSON("threads-intel-records", []));
    }
  }, [tiModal.open]);

  const today = todayString();
  const todayRecords = records.filter((r) => r.date === today);
  // Memoize archived count to avoid parsing JSON from localStorage on every render
  const archivedCount = useMemo(
    () => loadJSON<TiRecord[]>("threads-intel-archived", []).length,
    [records] // re-compute when records change (proxy for archive changes)
  );

  // History: search by account handle
  const filteredRecords = search
    ? records.filter((r) =>
        (r.account || "").toLowerCase().includes(search.toLowerCase())
      )
    : records;

  // Stats
  const tagCounts: Record<string, number> = {};
  for (const r of records) {
    for (const tag of r.painTags || []) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag, count]) => `${tag} (${count})`)
    .join(", ");

  // Export
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(records, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `threads-intel-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import
  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(reader.result as string);
        if (!Array.isArray(raw)) return;
        // Validate: only accept records with a string id
        const imported = raw.filter((r): r is TiRecord => r && typeof r.id === "string");
        // Merge: add imported records not already present (by id)
        const existingIds = new Set(records.map((r) => r.id));
        const newRecords = imported.filter((r) => !existingIds.has(r.id));
        const merged = [...records, ...newRecords];
        saveJSON("threads-intel-records", merged);
        setRecords(merged);
      } catch {
        // Invalid JSON — ignore
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-imported
    e.target.value = "";
  };

  const renderRecord = (record: TiRecord) => (
    <div
      key={record.id}
      onClick={() => openTiModal(block.id, record.id)}
      style={{
        padding: "8px",
        backgroundColor: "#fff",
        borderRadius: "4px",
        cursor: "pointer",
        marginBottom: "6px",
        border: "1px solid #eee",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "13px", fontWeight: "500" }}>
          @{record.account || "unknown"}
        </span>
        <span style={{ fontSize: "11px", color: "#999" }}>{record.date}</span>
      </div>
      {record.painTags && record.painTags.length > 0 && (
        <div style={{ display: "flex", gap: "4px", marginTop: "4px", flexWrap: "wrap" }}>
          {record.painTags.map((tag) => (
            <span
              key={tag}
              style={{
                padding: "2px 6px",
                backgroundColor: "#e0e0e0",
                borderRadius: "2px",
                fontSize: "10px",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  const tabs = [
    { key: "today" as const, label: "Today" },
    { key: "history" as const, label: "History" },
    { key: "stats" as const, label: "Stats" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* Tab bar with action buttons */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px",
          backgroundColor: "#f5f5f5",
          borderRadius: "4px",
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "6px 12px",
                fontSize: "12px",
                backgroundColor: tab === t.key ? "#333" : "#ddd",
                color: tab === t.key ? "#fff" : "#000",
                border: "none",
                borderRadius: "2px",
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
          <button
            onClick={handleExport}
            style={{
              padding: "6px 8px",
              fontSize: "12px",
              backgroundColor: "#ddd",
              border: "none",
              borderRadius: "2px",
              cursor: "pointer",
            }}
            title="Export records"
          >
            ↓
          </button>
          <button
            onClick={handleImport}
            style={{
              padding: "6px 8px",
              fontSize: "12px",
              backgroundColor: "#ddd",
              border: "none",
              borderRadius: "2px",
              cursor: "pointer",
            }}
            title="Import records"
          >
            ↑
          </button>
        </div>

        {tab !== "stats" && (
          <button
            onClick={() => openTiModal(block.id)}
            style={{
              padding: "6px 12px",
              fontSize: "12px",
              backgroundColor: "#333",
              color: "#fff",
              border: "none",
              borderRadius: "2px",
              cursor: "pointer",
            }}
          >
            + New
          </button>
        )}
      </div>

      {/* Tab content */}
      {tab === "today" && (
        <div
          style={{
            padding: "12px",
            backgroundColor: "#f9f9f9",
            borderRadius: "4px",
            minHeight: "200px",
          }}
        >
          {todayRecords.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                paddingTop: "40px",
                fontSize: "12px",
                color: "#666",
              }}
            >
              No records yet. Press + New to add one.
            </div>
          ) : (
            todayRecords.map(renderRecord)
          )}
        </div>
      )}

      {tab === "history" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search records..."
            style={{
              padding: "6px 8px",
              border: "1px solid #e0e0e0",
              borderRadius: "2px",
              fontSize: "12px",
            }}
          />
          <div
            style={{
              padding: "12px",
              backgroundColor: "#f9f9f9",
              borderRadius: "4px",
              minHeight: "200px",
              maxHeight: "400px",
              overflowY: "auto",
            }}
          >
            {filteredRecords.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  paddingTop: "40px",
                  fontSize: "12px",
                  color: "#666",
                }}
              >
                No history records found.
              </div>
            ) : (
              filteredRecords.map(renderRecord)
            )}
          </div>
        </div>
      )}

      {tab === "stats" && (
        <div
          style={{
            padding: "12px",
            backgroundColor: "#f9f9f9",
            borderRadius: "4px",
            minHeight: "200px",
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "12px",
          }}
        >
          <div
            style={{
              padding: "12px",
              backgroundColor: "#fff",
              borderRadius: "2px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "11px", color: "#666" }}>Total Records</div>
            <div style={{ fontSize: "20px", fontWeight: "bold" }}>{records.length}</div>
          </div>
          <div
            style={{
              padding: "12px",
              backgroundColor: "#fff",
              borderRadius: "2px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "11px", color: "#666" }}>Today</div>
            <div style={{ fontSize: "20px", fontWeight: "bold" }}>{todayRecords.length}</div>
          </div>
          <div
            style={{
              padding: "12px",
              backgroundColor: "#fff",
              borderRadius: "2px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "11px", color: "#666" }}>Common Tags</div>
            <div style={{ fontSize: "12px", color: "#999" }}>{topTags || "—"}</div>
          </div>
          <div
            style={{
              padding: "12px",
              backgroundColor: "#fff",
              borderRadius: "2px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "11px", color: "#666" }}>Archived</div>
            <div style={{ fontSize: "20px", fontWeight: "bold" }}>{archivedCount}</div>
          </div>
        </div>
      )}
    </div>
  );
}
