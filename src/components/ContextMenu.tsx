import { useEffect, useRef } from "react";
import { useBlockStore } from "../stores/useBlockStore";
import { useSessionStore } from "../stores/useSessionStore";
import { useSurfaceStore } from "../stores/useSurfaceStore";
import { useViewportStore } from "../stores/useViewportStore";
import { useHistoryStore } from "../stores/useHistoryStore";
import { pick } from "../utils/i18n";
import { useLang } from "../hooks/useLang";

interface Props {
  x: number;
  y: number;
  targetId: string | null;
  onClose: () => void;
}

function captureSnapshot() {
  return {
    blocks: useBlockStore.getState().blocks,
    elements: useSurfaceStore.getState().elements,
  };
}

export function ContextMenu({ x, y, targetId, onClose }: Props) {
  useLang();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click or escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const onPointer = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [onClose]);

  // Clamp to viewport
  const menuW = 180;
  const menuH = 160;
  const left = Math.min(x, window.innerWidth - menuW - 8);
  const top = Math.min(y, window.innerHeight - menuH - 8);

  function duplicate() {
    useHistoryStore.getState().push(captureSnapshot());
    const { selectedIds } = useSessionStore.getState();
    const ids = targetId && !selectedIds.includes(targetId)
      ? [targetId]
      : selectedIds;
    const { blocks, addBlock } = useBlockStore.getState();
    const newIds: string[] = [];
    for (const id of ids) {
      const block = blocks.find((b) => b.id === id);
      if (!block) continue;
      const newId = crypto.randomUUID();
      addBlock({ ...block, id: newId, x: block.x + 20, y: block.y + 20 });
      newIds.push(newId);
    }
    if (newIds.length) useSessionStore.getState().setSelectedIds(newIds);
    onClose();
  }

  function deleteSelected() {
    useHistoryStore.getState().push(captureSnapshot());
    const { selectedIds } = useSessionStore.getState();
    const ids = targetId && !selectedIds.includes(targetId)
      ? [targetId]
      : selectedIds;
    const { archiveBlock } = useBlockStore.getState();
    const { elements, removeElement } = useSurfaceStore.getState();
    for (const id of ids) {
      if (elements.some((el) => el.id === id)) removeElement(id);
      else archiveBlock(id);
    }
    useSessionStore.getState().clearSelection();
    onClose();
  }

  function bringToFront() {
    const id = targetId ?? useSessionStore.getState().selectedIds[0];
    if (id) useBlockStore.getState().bringToFront(id);
    onClose();
  }

  function fitToContent() {
    useViewportStore.getState().fitToContent(useBlockStore.getState().blocks);
    onClose();
  }

  function selectAll() {
    const ids = useBlockStore.getState().blocks
      .filter((b) => !b.archived && !b.pinned)
      .map((b) => b.id);
    useSessionStore.getState().setSelectedIds(ids);
    onClose();
  }

  const hasTarget = !!targetId;

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left, top }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {hasTarget ? (
        <>
          <button className="context-menu-item" onClick={duplicate}>
            <span className="context-menu-label">{pick("複製一份", "Duplicate")}</span>
            <span className="context-menu-shortcut">⌘D</span>
          </button>
          <button className="context-menu-item" onClick={bringToFront}>
            <span className="context-menu-label">{pick("移到最前", "Bring to front")}</span>
          </button>
          <div className="context-menu-sep" />
          <button className="context-menu-item context-menu-item--danger" onClick={deleteSelected}>
            <span className="context-menu-label">{pick("封存", "Archive")}</span>
            <span className="context-menu-shortcut">⌫</span>
          </button>
        </>
      ) : (
        <>
          <button className="context-menu-item" onClick={selectAll}>
            <span className="context-menu-label">{pick("全選", "Select all")}</span>
            <span className="context-menu-shortcut">⌘A</span>
          </button>
          <button className="context-menu-item" onClick={fitToContent}>
            <span className="context-menu-label">{pick("縮放至全覽", "Fit to content")}</span>
            <span className="context-menu-shortcut">⌘0</span>
          </button>
        </>
      )}
    </div>
  );
}
