import { useRef, useCallback } from "react";
import { useBlockStore } from "../stores/useBlockStore";
import { BlockShell } from "../blocks/BlockShell";
import { BLOCK_REGISTRY } from "../blocks/BlockRegistry";

/**
 * PinnedHUD — fixed overlay panel for pinned blocks.
 * Renders in viewport-space (outside canvas transform) so blocks
 * stay visible while panning/zooming. Supports drag-to-reorder.
 */
export function PinnedHUD() {
  const { blocks, updateBlock } = useBlockStore();
  const pinnedBlocks = blocks
    .filter((b) => b.pinned && !b.archived)
    .sort((a, b) => (a.pinnedOrder ?? 0) - (b.pinnedOrder ?? 0));

  const dragState = useRef<{
    blockId: string;
    startY: number;
    order: { id: string; order: number }[];
  } | null>(null);

  const handleReorderStart = useCallback(
    (blockId: string, e: React.PointerEvent) => {
      e.stopPropagation();
      const currentOrder = pinnedBlocks.map((b) => ({
        id: b.id,
        order: b.pinnedOrder ?? 0,
      }));
      dragState.current = { blockId, startY: e.clientY, order: currentOrder };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [pinnedBlocks]
  );

  const handleReorderMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.current) return;
      const dy = e.clientY - dragState.current.startY;
      // Each pinned block is ~44px (header height). If moved more than half, swap.
      const slots = Math.round(dy / 44);
      if (slots === 0) return;

      const { blockId, order } = dragState.current;
      const myIdx = order.findIndex((o) => o.id === blockId);
      const targetIdx = Math.max(0, Math.min(order.length - 1, myIdx + slots));
      if (myIdx === targetIdx) return;

      // Swap orders
      const newOrder = [...order];
      const [moved] = newOrder.splice(myIdx, 1);
      newOrder.splice(targetIdx, 0, moved);

      // Persist new order
      newOrder.forEach((item, i) => {
        if (item.order !== i) {
          updateBlock(item.id, { pinnedOrder: i });
        }
      });

      // Update drag state baseline
      dragState.current = {
        ...dragState.current,
        startY: e.clientY,
        order: newOrder.map((item, i) => ({ ...item, order: i })),
      };
    },
    [updateBlock]
  );

  const handleReorderEnd = useCallback(() => {
    dragState.current = null;
  }, []);

  if (pinnedBlocks.length === 0) return null;

  return (
    <div
      className="pinned-hud"
      onPointerMove={handleReorderMove}
      onPointerUp={handleReorderEnd}
    >
      {pinnedBlocks.map((block) => {
        const BlockComponent = BLOCK_REGISTRY[block.type]?.component;
        if (!BlockComponent) return null;

        return (
          <div
            key={block.id}
            className="pinned-hud-item"
            onPointerDown={(e) => handleReorderStart(block.id, e)}
          >
            <BlockShell block={block}>
              <BlockComponent block={block} />
            </BlockShell>
          </div>
        );
      })}
    </div>
  );
}
