import { useState, useCallback } from "react";
import {
  transitionBroadcast,
  createBroadcast,
  createLiveStream,
  bindBroadcast,
  updateBroadcastPrivacy,
  deleteBroadcast,
} from "../../utils/youtubeApi";
import { pick } from "../../utils/i18n";
import type { YTBroadcast } from "../../utils/youtubeApi";

interface UseYouTubeBroadcastLifecycleParams {
  refresh: () => Promise<void>;
  setError: (msg: string | null) => void;
}

export function useYouTubeBroadcastLifecycle({ refresh, setError }: UseYouTubeBroadcastLifecycleParams) {
  const [transitioning, setTransitioning] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createPrivacy, setCreatePrivacy] = useState<"public" | "private" | "unlisted">("private");
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrivacy, setEditPrivacy] = useState<"public" | "private" | "unlisted">("private");
  const [editSaving, setEditSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleTransition = useCallback(async (id: string, status: "testing" | "live" | "complete") => {
    if (status === "complete") {
      const confirmed = window.confirm(pick("確定要結束直播？", "End the live stream?"));
      if (!confirmed) return;
    }
    setError(null);
    setTransitioning(true);
    try {
      const result = await transitionBroadcast(id, status);
      if (result.ok) {
        await refresh();
      } else {
        setError(result.error ?? pick("操作失敗", "Operation failed"));
      }
    } catch {
      setError(pick("操作失敗", "Operation failed"));
    } finally {
      setTransitioning(false);
    }
  }, [refresh, setError]);

  const handleCreate = useCallback(async () => {
    if (!createTitle.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const result = await createBroadcast(createTitle.trim(), createPrivacy);
      if (!result) throw new Error("broadcast creation failed");
      const { id: broadcastId, privacyStatus: actualPrivacy } = result;

      if (actualPrivacy !== createPrivacy) {
        console.warn(`YouTube overrode privacy: requested "${createPrivacy}", got "${actualPrivacy}" — attempting fix`);
        const fixResult = await updateBroadcastPrivacy(
          {
            id: broadcastId,
            title: createTitle.trim(),
            description: "",
            scheduledStartTime: new Date().toISOString(),
            thumbnail: "",
            lifeCycleStatus: "created",
            privacyStatus: actualPrivacy,
            boundStreamId: null,
            concurrentViewers: null,
          },
          createPrivacy
        );
        if (!fixResult.ok) {
          setError(pick(
            `直播已建立，但 YouTube 將隱私設為「私人」(${fixResult.error ?? "平台限制"})`,
            `Broadcast created, but YouTube set privacy to "private" (${fixResult.error ?? "platform restriction"})`
          ));
        }
      }

      const streamInfo = await createLiveStream(createTitle.trim());
      if (!streamInfo) throw new Error("stream creation failed");
      await bindBroadcast(broadcastId, streamInfo.streamId);
      setShowCreateForm(false);
      setCreateTitle("");
      await refresh();
    } catch {
      setError(pick("建立直播失敗", "Failed to create broadcast"));
    } finally {
      setCreating(false);
    }
  }, [createTitle, createPrivacy, refresh, setError]);

  const handleUpdatePrivacy = useCallback(async (bc: YTBroadcast) => {
    setEditSaving(true);
    const result = await updateBroadcastPrivacy(bc, editPrivacy);
    setEditSaving(false);
    if (result.ok) {
      setEditingId(null);
      await refresh();
    } else {
      setError(result.error ?? pick("更新失敗", "Update failed"));
    }
  }, [editPrivacy, refresh, setError]);

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      const result = await deleteBroadcast(id);
      if (result.ok) {
        if (selectedId === id) setSelectedId(null);
        if (editingId === id) setEditingId(null);
        await refresh();
      } else {
        setError(result.error ?? pick("刪除失敗", "Delete failed"));
      }
    } finally {
      setDeletingId(null);
    }
  }, [selectedId, editingId, refresh, setError]);

  return {
    transitioning,
    showCreateForm, setShowCreateForm,
    createTitle, setCreateTitle,
    createPrivacy, setCreatePrivacy,
    creating,
    selectedId, setSelectedId,
    editingId, setEditingId,
    editPrivacy, setEditPrivacy,
    editSaving,
    deletingId,
    handleTransition,
    handleCreate,
    handleUpdatePrivacy,
    handleDelete,
  };
}
