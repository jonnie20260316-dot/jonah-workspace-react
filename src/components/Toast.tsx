import { X } from "lucide-react";
import { useToast } from "../hooks/useToast";
import type { ToastVariant } from "../hooks/useToast";

const DOT_COLORS: Record<ToastVariant, string> = {
  success: "var(--success)",
  error: "var(--danger)",
  warning: "var(--gold)",
  info: "var(--accent)",
};

function ToastItem({ id, message, variant, action }: {
  id: string;
  message: string;
  variant: ToastVariant;
  action?: { label: string; onClick: () => void };
}) {
  const { dismiss } = useToast();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        background: "rgba(36, 50, 49, 0.92)",
        backdropFilter: "blur(12px) saturate(140%)",
        WebkitBackdropFilter: "blur(12px) saturate(140%)",
        borderRadius: "var(--radius-pill)",
        color: "var(--text-inverted)",
        fontSize: 13,
        boxShadow: "var(--shadow-float)",
        animation: "toastIn 260ms var(--ease-spring) forwards",
        maxWidth: 380,
        userSelect: "none",
      }}
    >
      {/* Semantic dot */}
      <span style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: DOT_COLORS[variant],
        flexShrink: 0,
      }} />

      {/* Message */}
      <span style={{ flex: 1, lineHeight: 1.5 }}>{message}</span>

      {/* Action link */}
      {action && (
        <button
          onClick={() => { action.onClick(); dismiss(id); }}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-inverted)",
            cursor: "pointer",
            fontSize: 12,
            opacity: 0.7,
            textDecoration: "underline",
            padding: 0,
            flexShrink: 0,
          }}
        >
          {action.label}
        </button>
      )}

      {/* Dismiss */}
      <button
        onClick={() => dismiss(id)}
        style={{
          background: "none",
          border: "none",
          color: "var(--text-inverted)",
          cursor: "pointer",
          opacity: 0.5,
          display: "flex",
          alignItems: "center",
          padding: 0,
          flexShrink: 0,
        }}
      >
        <X size={13} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 600,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        alignItems: "center",
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: "auto" }}>
          <ToastItem {...t} />
        </div>
      ))}
    </div>
  );
}
