import { useCallback } from "react";

interface UsePipDragParams {
  pipPosition: { x: number; y: number };
  setPipPosition: (pos: { x: number; y: number }) => void;
  pipDragRef: React.MutableRefObject<{ dragging: boolean; offsetX: number; offsetY: number }>;
  stageRef: React.RefObject<HTMLDivElement | null>;
}

export function usePipDrag({
  pipPosition,
  setPipPosition,
  pipDragRef,
  stageRef,
}: UsePipDragParams) {
  const handlePipDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const stage = stageRef.current;
    if (!stage) return;

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const rect = stage.getBoundingClientRect();

    // PiP overlay is 20% of stage width
    const pipW = rect.width * 0.2;
    const pipH = pipW * 0.75; // approx 4:3
    const margin = 8;
    const maxX = rect.width - pipW - margin;
    const maxY = rect.height - pipH - margin;
    const currentPx = margin + pipPosition.x * maxX;
    const currentPy = margin + pipPosition.y * maxY;

    pipDragRef.current = {
      dragging: true,
      offsetX: clientX - rect.left - currentPx,
      offsetY: clientY - rect.top - currentPy,
    };

    const onMove = (ev: MouseEvent | TouchEvent) => {
      if (!pipDragRef.current.dragging) return;
      const cx = "touches" in ev ? ev.touches[0].clientX : ev.clientX;
      const cy = "touches" in ev ? ev.touches[0].clientY : ev.clientY;
      const stageRect = stage.getBoundingClientRect();
      const mW = stageRect.width * 0.2;
      const mH = mW * 0.75;
      const mg = 8;
      const mxX = stageRect.width - mW - mg;
      const mxY = stageRect.height - mH - mg;

      const rawX = cx - stageRect.left - pipDragRef.current.offsetX - mg;
      const rawY = cy - stageRect.top - pipDragRef.current.offsetY - mg;
      const nx = Math.max(0, Math.min(1, mxX > 0 ? rawX / mxX : 0));
      const ny = Math.max(0, Math.min(1, mxY > 0 ? rawY / mxY : 0));
      setPipPosition({ x: nx, y: ny });
    };

    const onUp = () => {
      pipDragRef.current.dragging = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchmove", onMove);
    document.addEventListener("touchend", onUp);
  }, [pipPosition, setPipPosition, pipDragRef, stageRef]);

  /* ── Compute PiP overlay position for the preview div ── */
  const pipOverlayStyle = (): React.CSSProperties => {
    const pipW = 20; // % of stage
    const pipH = 15; // approx 4:3
    const margin = 2; // %
    const maxX = 100 - pipW - margin;
    const maxY = 100 - pipH - margin;
    return {
      position: "absolute",
      width: `${pipW}%`,
      aspectRatio: "4/3",
      left: `${margin + pipPosition.x * maxX}%`,
      top: `${margin + pipPosition.y * maxY}%`,
      borderRadius: "8px",
      overflow: "hidden",
      border: "2px solid rgba(255,255,255,0.7)",
      cursor: "grab",
      zIndex: 10,
      boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
    };
  };

  return { handlePipDragStart, pipOverlayStyle };
}
