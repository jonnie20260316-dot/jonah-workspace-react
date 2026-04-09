import { useState, useCallback, useEffect, useRef } from "react";
import { loadJSON, loadText, saveJSON, saveText } from "../utils/storage";
import { useSessionStore } from "../stores/useSessionStore";
import { useToast } from "./useToast";
import { pick } from "../utils/i18n";

/**
 * Hook for managing a single block field with localStorage persistence.
 * Reads from storage on mount, writes back on change.
 * Handles both string (loadText/saveText) and JSON (loadJSON/saveJSON) automatically.
 *
 * options.global = true → stores under "block-global:{blockId}:{fieldKey}" which
 * is matched by the GLOBAL_KEY_PREFIXES entry and is never date-scoped.
 * Use for persistent blocks (sticky, intel, etc.). Daily blocks (journal, kit,
 * intention, tasks) omit this option so content stays date-scoped.
 *
 * When the active date changes, date-scoped fields automatically re-read from
 * storage so daily blocks reflect the newly selected day's content.
 */
export function useBlockField<T>(
  blockId: string,
  fieldKey: string,
  fallback: T,
  options?: { global?: boolean }
): [T, (value: T) => void] {
  const isGlobal = options?.global === true;
  const storageKey = isGlobal
    ? `block-global:${blockId}:${fieldKey}`
    : `${blockId}:${fieldKey}`;

  // Stable ref for fallback — prevents effect from re-running if caller passes
  // an inline object/array (e.g. [] or {}) as fallback on every render.
  const fallbackRef = useRef(fallback);

  const [value, setValue] = useState<T>(() => {
    if (typeof fallback === "string") {
      return loadText(storageKey, fallback as string) as T;
    }
    return loadJSON(storageKey, fallback);
  });

  // Re-read from storage when the active date changes (date-scoped fields only).
  // _activeDate in storage.ts is updated synchronously before Zustand fires,
  // so loadText/loadJSON will already see the new date by the time this effect runs.
  const activeDate = useSessionStore((s) => s.activeDate);
  useEffect(() => {
    if (isGlobal) return;
    const fb = fallbackRef.current;
    const fresh =
      typeof fb === "string"
        ? (loadText(storageKey, fb as string) as T)
        : loadJSON(storageKey, fb);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(fresh);
  }, [activeDate, isGlobal, storageKey]);

  const update = useCallback(
    (newValue: T) => {
      const ok = typeof newValue === "string"
        ? saveText(storageKey, newValue)
        : saveJSON(storageKey, newValue);
      if (!ok) {
        useToast.getState().show(
          pick("儲存失敗，空間不足", "Save failed — storage full"),
          "error"
        );
      }
      setValue(newValue);
    },
    [storageKey]
  );

  return [value, update];
}
