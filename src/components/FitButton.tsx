import { useBlockStore } from "../stores/useBlockStore";
import { useViewportStore } from "../stores/useViewportStore";
import { pick } from "../utils/i18n";

/**
 * Fit-to-content button — fixed bottom-right corner.
 * Zooms the viewport to show all visible blocks. Keyboard: Cmd+0.
 */
export function FitButton() {
  const blocks = useBlockStore((s) => s.blocks);
  const fitToContent = useViewportStore((s) => s.fitToContent);

  return (
    <button
      className="fit-button"
      onClick={() => fitToContent(blocks)}
      title={pick("縮放至全部內容 (⌘0)", "Fit to content (⌘0)")}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <path d="M2 5V2h3M11 2h3v3M14 11v3h-3M5 14H2v-3" />
      </svg>
    </button>
  );
}
