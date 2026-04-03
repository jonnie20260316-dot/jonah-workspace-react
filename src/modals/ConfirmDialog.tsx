import { useModalStore } from "../stores/useModalStore";

/**
 * ConfirmDialog - Shared confirm/alert dialog
 * Ports confirmAction logic from workspace.html line 8247-8258
 */

export function ConfirmDialog() {
  const { confirmModal, closeConfirmModal } = useModalStore();

  if (!confirmModal.open) return null;

  const handleOk = () => {
    if (confirmModal.resolve) {
      confirmModal.resolve(true);
    }
    closeConfirmModal();
  };

  const handleCancel = () => {
    if (confirmModal.resolve) {
      confirmModal.resolve(false);
    }
    closeConfirmModal();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000, // Higher than other modals
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCancel();
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "8px",
          padding: "24px",
          maxWidth: "400px",
          width: "90%",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}
      >
        <p
          style={{
            margin: "0 0 24px 0",
            fontSize: "1rem",
            lineHeight: "1.5",
          }}
        >
          {confirmModal.message}
        </p>

        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={handleCancel}
            style={{
              padding: "8px 16px",
              background: "#f0f0f0",
              border: "1px solid #ddd",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.95rem",
            }}
          >
            {confirmModal.cancelLabel}
          </button>
          <button
            onClick={handleOk}
            style={{
              padding: "8px 16px",
              background: "#007AFF",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.95rem",
            }}
          >
            {confirmModal.okLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
