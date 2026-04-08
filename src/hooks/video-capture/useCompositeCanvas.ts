import { useCallback } from "react";

interface UseCompositeCanvasParams {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  screenVideoRef: React.RefObject<HTMLVideoElement | null>;
  pipVideoRef: React.RefObject<HTMLVideoElement | null>;
  pipPositionRef: React.MutableRefObject<{ x: number; y: number }>;
  rafRef: React.MutableRefObject<number>;
  compositeStreamRef: React.MutableRefObject<MediaStream | null>;
}

export function useCompositeCanvas({
  canvasRef,
  screenVideoRef,
  pipVideoRef,
  pipPositionRef,
  rafRef,
  compositeStreamRef,
}: UseCompositeCanvasParams) {
  const startCompositeLoop = useCallback(() => {
    const canvas = canvasRef.current;
    const screenVid = screenVideoRef.current;
    const pipVid = pipVideoRef.current;
    if (!canvas || !screenVid) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      // Match canvas to screen video resolution
      if (screenVid.videoWidth && screenVid.videoHeight) {
        canvas.width = screenVid.videoWidth;
        canvas.height = screenVid.videoHeight;
      }

      // Draw screen (full frame)
      ctx.drawImage(screenVid, 0, 0, canvas.width, canvas.height);

      // Draw PiP camera overlay
      if (pipVid && pipVid.videoWidth > 0) {
        const pipW = canvas.width * 0.2;
        const pipH = pipW * (pipVid.videoHeight / pipVid.videoWidth);
        // pipPosition is normalized 0-1; map to canvas coords with margin
        const margin = 16;
        const maxX = canvas.width - pipW - margin;
        const maxY = canvas.height - pipH - margin;
        const pos = pipPositionRef.current;
        const px = margin + pos.x * maxX;
        const py = margin + pos.y * maxY;

        // Rounded rectangle clip
        const radius = 12;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(px + radius, py);
        ctx.lineTo(px + pipW - radius, py);
        ctx.quadraticCurveTo(px + pipW, py, px + pipW, py + radius);
        ctx.lineTo(px + pipW, py + pipH - radius);
        ctx.quadraticCurveTo(px + pipW, py + pipH, px + pipW - radius, py + pipH);
        ctx.lineTo(px + radius, py + pipH);
        ctx.quadraticCurveTo(px, py + pipH, px, py + pipH - radius);
        ctx.lineTo(px, py + radius);
        ctx.quadraticCurveTo(px, py, px + radius, py);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(pipVid, px, py, pipW, pipH);
        ctx.restore();

        // White border
        ctx.save();
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(px + radius, py);
        ctx.lineTo(px + pipW - radius, py);
        ctx.quadraticCurveTo(px + pipW, py, px + pipW, py + radius);
        ctx.lineTo(px + pipW, py + pipH - radius);
        ctx.quadraticCurveTo(px + pipW, py + pipH, px + pipW - radius, py + pipH);
        ctx.lineTo(px + radius, py + pipH);
        ctx.quadraticCurveTo(px, py + pipH, px, py + pipH - radius);
        ctx.lineTo(px, py + radius);
        ctx.quadraticCurveTo(px, py, px + radius, py);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
  }, [canvasRef, screenVideoRef, pipVideoRef, pipPositionRef, rafRef]);

  const stopCompositeLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    if (compositeStreamRef.current) {
      compositeStreamRef.current.getTracks().forEach((t) => t.stop());
      compositeStreamRef.current = null;
    }
  }, [rafRef, compositeStreamRef]);

  return { startCompositeLoop, stopCompositeLoop };
}
