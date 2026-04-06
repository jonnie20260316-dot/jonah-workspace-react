import { useState, useCallback } from "react";
import { loadJSON, loadText, saveJSON, saveText } from "../utils/storage";

/**
 * Hook for managing a single block field with localStorage persistence.
 * Reads from storage on mount, writes back on change.
 * Handles both string (loadText/saveText) and JSON (loadJSON/saveJSON) automatically.
 *
 * options.global = true → stores under "block-global:{blockId}:{fieldKey}" which
 * is matched by the GLOBAL_KEY_PREFIXES entry and is never date-scoped.
 * Use for persistent blocks (sticky, intel, etc.). Daily blocks (journal, kit,
 * intention, tasks) omit this option so content stays date-scoped.
 */
export function useBlockField<T>(
  blockId: string,
  fieldKey: string,
  fallback: T,
  options?: { global?: boolean }
): [T, (value: T) => void] {
  const storageKey = options?.global
    ? `block-global:${blockId}:${fieldKey}`
    : `${blockId}:${fieldKey}`;

  const [value, setValue] = useState<T>(() => {
    if (typeof fallback === "string") {
      return loadText(storageKey, fallback as string) as T;
    }
    return loadJSON(storageKey, fallback);
  });

  const update = useCallback(
    (newValue: T) => {
      if (typeof newValue === "string") {
        saveText(storageKey, newValue);
      } else {
        saveJSON(storageKey, newValue);
      }
      setValue(newValue);
    },
    [storageKey]
  );

  return [value, update];
}
