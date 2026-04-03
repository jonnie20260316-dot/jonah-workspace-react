import { useState, useEffect } from "react";
import { useModalStore } from "../stores/useModalStore";
import { loadJSON, saveJSON } from "../utils/storage";

/**
 * ThreadsIntelModal - Threads Intel block modal for recording account analysis
 * Ports openThreadsIntelModal logic from workspace.html line 5552-5681
 * Phase 1: render all fields (skip conditional logic for now)
 */

const THREADS_INTEL_PAIN_TAGS = [
  { id: "brand-clarity", label: "品牌不清楚" },
  { id: "audience-gap", label: "受眾落差" },
  { id: "value-prop", label: "價值主張弱" },
  { id: "engagement-low", label: "互動度低" },
  { id: "credibility", label: "可信度不足" },
  { id: "positioning", label: "定位不穩" },
  { id: "content-quality", label: "內容品質" },
  { id: "frequency", label: "發文頻率" },
  { id: "growth", label: "成長緩慢" },
];

interface ThreadsIntelRecord {
  id: string;
  name: string;
  handle: string;
  url: string;
  filterReal?: boolean;
  filterSubstance?: boolean;
  filterActive?: boolean;
  rejectionReason?: string;
  passedFilter?: boolean;
  analysis?: {
    selling: string;
    readerGap: string;
    theirAssumption: string;
    realGap: string;
  };
  comment?: {
    decision: string;
    decisionReason: string;
    corePoint: string;
    draft: string;
  };
  painTags?: string[];
  customTag?: string;
  blindspot?: {
    whatWentWrong: string;
    correctApproach: string;
    isRepeat: boolean;
    repeatCount: number;
  };
  followUp?: {
    replied: boolean | null;
    replyContent: string;
    effective: string | null;
  };
}

export function ThreadsIntelModal() {
  const { tiModal, closeTiModal } = useModalStore();
  const [record, setRecord] = useState<ThreadsIntelRecord | null>(null);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [url, setUrl] = useState("");
  const [filterReal, setFilterReal] = useState(false);
  const [filterSubstance, setFilterSubstance] = useState(false);
  const [filterActive, setFilterActive] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selling, setSelling] = useState("");
  const [readerGap, setReaderGap] = useState("");
  const [theirAssumption, setTheirAssumption] = useState("");
  const [realGap, setRealGap] = useState("");
  const [decision, setDecision] = useState<"comment" | "skip" | "observe">("skip");
  const [decisionReason, setDecisionReason] = useState("");
  const [corePoint, setCorePoint] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [painTags, setPainTags] = useState<Set<string>>(new Set());
  const [customTag, setCustomTag] = useState("");
  const [blindspotWrong, setBlindspotWrong] = useState("");
  const [blindspotCorrect, setBlindspotCorrect] = useState("");
  const [isRepeat, setIsRepeat] = useState(false);
  const [repeatCount, setRepeatCount] = useState(2);
  const [followupReplied, setFollowupReplied] = useState<"yes" | "no" | "pending">("pending");
  const [followupContent, setFollowupContent] = useState("");
  const [followupEffective, setFollowupEffective] = useState<"yes" | "no" | "unclear" | "">("yes");

  useEffect(() => {
    if (!tiModal.open || !tiModal.blockId) return;

    const records = loadJSON("threads-intel-records", []) as ThreadsIntelRecord[];
    if (tiModal.recordId) {
      const rec = records.find((r) => r.id === tiModal.recordId);
      if (rec) {
        setRecord(rec);
        setName(rec.name || "");
        setHandle(rec.handle || "");
        setUrl(rec.url || "");
        setFilterReal(rec.filterReal || false);
        setFilterSubstance(rec.filterSubstance || false);
        setFilterActive(rec.filterActive || false);
        setRejectionReason(rec.rejectionReason || "");
        setSelling(rec.analysis?.selling || "");
        setReaderGap(rec.analysis?.readerGap || "");
        setTheirAssumption(rec.analysis?.theirAssumption || "");
        setRealGap(rec.analysis?.realGap || "");
        setDecision(rec.comment?.decision as any || "skip");
        setDecisionReason(rec.comment?.decisionReason || "");
        setCorePoint(rec.comment?.corePoint || "");
        setCommentDraft(rec.comment?.draft || "");
        setPainTags(new Set(rec.painTags || []));
        setCustomTag(rec.customTag || "");
        setBlindspotWrong(rec.blindspot?.whatWentWrong || "");
        setBlindspotCorrect(rec.blindspot?.correctApproach || "");
        setIsRepeat(rec.blindspot?.isRepeat || false);
        setRepeatCount(rec.blindspot?.repeatCount || 2);
        setFollowupReplied(
          rec.followUp?.replied === true
            ? "yes"
            : rec.followUp?.replied === false
              ? "no"
              : "pending"
        );
        setFollowupContent(rec.followUp?.replyContent || "");
        setFollowupEffective((rec.followUp?.effective || "") as any);
      }
    }
  }, [tiModal.open, tiModal.blockId, tiModal.recordId]);

  const handleSave = () => {
    if (!tiModal.blockId) return;

    const records = loadJSON("threads-intel-records", []) as ThreadsIntelRecord[];
    const passedFilter = filterReal && filterSubstance && filterActive;

    const newRecord: ThreadsIntelRecord = {
      id: record?.id || `ti-${Date.now()}`,
      name,
      handle,
      url,
      filterReal,
      filterSubstance,
      filterActive,
      rejectionReason,
      passedFilter,
      analysis: {
        selling,
        readerGap,
        theirAssumption,
        realGap,
      },
      comment: {
        decision,
        decisionReason,
        corePoint,
        draft: commentDraft,
      },
      painTags: Array.from(painTags),
      customTag,
      blindspot: {
        whatWentWrong: blindspotWrong,
        correctApproach: blindspotCorrect,
        isRepeat,
        repeatCount,
      },
      followUp: {
        replied:
          followupReplied === "yes" ? true : followupReplied === "no" ? false : null,
        replyContent: followupContent,
        effective:
          followupEffective === "" ? null : (followupEffective as any),
      },
    };

    if (record) {
      const idx = records.findIndex((r) => r.id === record.id);
      if (idx >= 0) records[idx] = newRecord;
    } else {
      records.push(newRecord);
    }

    saveJSON("threads-intel-records", records);
    closeTiModal();
  };

  const handleDelete = () => {
    if (!record || !tiModal.blockId) return;

    const records = loadJSON("threads-intel-records", []) as ThreadsIntelRecord[];
    const filtered = records.filter((r) => r.id !== record.id);
    saveJSON("threads-intel-records", filtered);
    closeTiModal();
  };

  const handlePainTagToggle = (tagId: string) => {
    setPainTags((prev) => {
      const updated = new Set(prev);
      if (updated.has(tagId)) {
        updated.delete(tagId);
      } else {
        updated.add(tagId);
      }
      return updated;
    });
  };

  if (!tiModal.open) return null;

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
        if (e.target === e.currentTarget) closeTiModal();
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "8px",
          padding: "24px",
          maxWidth: "600px",
          width: "90%",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ margin: 0 }}>帳號分析</h2>
          <button
            onClick={closeTiModal}
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

        <h3 style={{ marginTop: "16px", marginBottom: "8px", fontSize: "0.9rem", color: "#666" }}>基本資訊</h3>

        <label style={{ display: "block", fontWeight: 600, marginBottom: "8px", fontSize: "0.9rem" }}>帳號名稱</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例：三木品牌行銷"
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            marginBottom: "12px",
            boxSizing: "border-box",
          }}
        />

        <label style={{ display: "block", fontWeight: 600, marginBottom: "8px", fontSize: "0.9rem" }}>帳號 ID</label>
        <input
          type="text"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="@handle"
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            marginBottom: "12px",
            boxSizing: "border-box",
          }}
        />

        <label style={{ display: "block", fontWeight: 600, marginBottom: "8px", fontSize: "0.9rem" }}>帳號連結</label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://threads.com/@..."
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            marginBottom: "16px",
            boxSizing: "border-box",
          }}
        />

        <h3 style={{ marginTop: "16px", marginBottom: "8px", fontSize: "0.9rem", color: "#666" }}>三條件篩選</h3>
        <div style={{ marginBottom: "12px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem" }}>
            <input
              type="checkbox"
              checked={filterReal}
              onChange={(e) => setFilterReal(e.target.checked)}
            />
            {" 說話有沒有來自真實經驗？"}
          </label>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem" }}>
            <input
              type="checkbox"
              checked={filterSubstance}
              onChange={(e) => setFilterSubstance(e.target.checked)}
            />
            {" 有料但說不清自己嗎？"}
          </label>
          <label style={{ display: "block", marginBottom: "12px", fontSize: "0.9rem" }}>
            <input
              type="checkbox"
              checked={filterActive}
              onChange={(e) => setFilterActive(e.target.checked)}
            />
            {" 最近兩週有在發文嗎？"}
          </label>
        </div>

        {!filterReal || !filterSubstance || !filterActive ? (
          <>
            <label style={{ display: "block", fontWeight: 600, marginBottom: "8px", fontSize: "0.9rem" }}>
              停止原因（一句話）
            </label>
            <input
              type="text"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                marginBottom: "16px",
                boxSizing: "border-box",
              }}
            />
          </>
        ) : null}

        <h3 style={{ marginTop: "16px", marginBottom: "8px", fontSize: "0.9rem", color: "#666" }}>帳號解剖</h3>

        <label style={{ display: "block", fontWeight: 600, marginBottom: "8px", fontSize: "0.9rem" }}>
          他在賣什麼（一句話）
        </label>
        <input
          type="text"
          value={selling}
          onChange={(e) => setSelling(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            marginBottom: "12px",
            boxSizing: "border-box",
          }}
        />

        <label style={{ display: "block", fontWeight: 600, marginBottom: "8px", fontSize: "0.9rem" }}>
          讀者看完缺什麼
        </label>
        <input
          type="text"
          value={readerGap}
          onChange={(e) => setReaderGap(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            marginBottom: "12px",
            boxSizing: "border-box",
          }}
        />

        <label style={{ display: "block", fontWeight: 600, marginBottom: "8px", fontSize: "0.9rem" }}>
          他以為重點是什麼
        </label>
        <input
          type="text"
          value={theirAssumption}
          onChange={(e) => setTheirAssumption(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            marginBottom: "12px",
            boxSizing: "border-box",
          }}
        />

        <label style={{ display: "block", fontWeight: 600, marginBottom: "8px", fontSize: "0.9rem" }}>
          真正的缺口在哪
        </label>
        <input
          type="text"
          value={realGap}
          onChange={(e) => setRealGap(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            marginBottom: "16px",
            boxSizing: "border-box",
          }}
        />

        <h3 style={{ marginTop: "16px", marginBottom: "8px", fontSize: "0.9rem", color: "#666" }}>留言決策</h3>

        <div style={{ marginBottom: "12px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem" }}>
            <input
              type="radio"
              name="tiDecision"
              value="comment"
              checked={decision === "comment"}
              onChange={(e) => setDecision(e.target.value as any)}
            />
            {" 適合——有缺口可以切"}
          </label>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem" }}>
            <input
              type="radio"
              name="tiDecision"
              value="skip"
              checked={decision === "skip"}
              onChange={(e) => setDecision(e.target.value as any)}
            />
            {" 不適合——已在上位輸出"}
          </label>
          <label style={{ display: "block", marginBottom: "12px", fontSize: "0.9rem" }}>
            <input
              type="radio"
              name="tiDecision"
              value="observe"
              checked={decision === "observe"}
              onChange={(e) => setDecision(e.target.value as any)}
            />
            {" 觀察就好——素材型"}
          </label>
        </div>

        <label style={{ display: "block", fontWeight: 600, marginBottom: "8px", fontSize: "0.9rem" }}>
          判斷理由（一句話）
        </label>
        <input
          type="text"
          value={decisionReason}
          onChange={(e) => setDecisionReason(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            marginBottom: "12px",
            boxSizing: "border-box",
          }}
        />

        {decision === "comment" && (
          <>
            <label style={{ display: "block", fontWeight: 600, marginBottom: "8px", fontSize: "0.9rem" }}>
              核心觀點（留言的那一刀）
            </label>
            <textarea
              value={corePoint}
              onChange={(e) => setCorePoint(e.target.value)}
              rows={2}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                marginBottom: "12px",
                boxSizing: "border-box",
              }}
            />

            <label style={{ display: "block", fontWeight: 600, marginBottom: "8px", fontSize: "0.9rem" }}>
              留言草稿（2-3 行）
            </label>
            <textarea
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
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
          </>
        )}

        <h3 style={{ marginTop: "16px", marginBottom: "8px", fontSize: "0.9rem", color: "#666" }}>品牌痛點標籤</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
          {THREADS_INTEL_PAIN_TAGS.map((tag) => (
            <button
              key={tag.id}
              onClick={() => handlePainTagToggle(tag.id)}
              style={{
                padding: "6px 12px",
                background: painTags.has(tag.id) ? "#007AFF" : "#f0f0f0",
                color: painTags.has(tag.id) ? "white" : "#333",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              {tag.label}
            </button>
          ))}
        </div>

        <label style={{ display: "block", fontWeight: 600, marginBottom: "8px", fontSize: "0.9rem" }}>
          自訂標籤
        </label>
        <input
          type="text"
          value={customTag}
          onChange={(e) => setCustomTag(e.target.value)}
          placeholder="輸入自訂標籤"
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            marginBottom: "16px",
            boxSizing: "border-box",
          }}
        />

        <h3 style={{ marginTop: "16px", marginBottom: "8px", fontSize: "0.9rem", color: "#666" }}>盲點記錄</h3>

        <label style={{ display: "block", fontWeight: 600, marginBottom: "8px", fontSize: "0.9rem" }}>
          這次我沒做好的地方（具體說）
        </label>
        <textarea
          value={blindspotWrong}
          onChange={(e) => setBlindspotWrong(e.target.value)}
          rows={2}
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            marginBottom: "12px",
            boxSizing: "border-box",
          }}
        />

        <label style={{ display: "block", fontWeight: 600, marginBottom: "8px", fontSize: "0.9rem" }}>
          正確做法應該是
        </label>
        <textarea
          value={blindspotCorrect}
          onChange={(e) => setBlindspotCorrect(e.target.value)}
          rows={2}
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            marginBottom: "12px",
            boxSizing: "border-box",
          }}
        />

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem" }}>
            <input
              type="radio"
              name="tiRepeat"
              value="first"
              checked={!isRepeat}
              onChange={() => setIsRepeat(false)}
            />
            {" 第一次"}
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.9rem" }}>
            <input
              type="radio"
              name="tiRepeat"
              value="repeat"
              checked={isRepeat}
              onChange={() => setIsRepeat(true)}
            />
            {" 重複出現"}
            <span>第</span>
            <input
              type="number"
              min="2"
              value={repeatCount}
              onChange={(e) => setRepeatCount(Math.max(2, Number(e.target.value)))}
              style={{ width: "50px", padding: "4px 8px" }}
            />
            <span>次</span>
          </label>
        </div>

        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          {record && (
            <button
              onClick={handleDelete}
              style={{
                padding: "8px 16px",
                background: "#f0f0f0",
                color: "#c0392b",
                border: "1px solid #ddd",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              刪除此紀錄
            </button>
          )}
          <button
            onClick={closeTiModal}
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
            儲存分析
          </button>
        </div>
      </div>
    </div>
  );
}
