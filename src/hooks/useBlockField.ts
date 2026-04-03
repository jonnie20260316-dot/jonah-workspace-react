import { useState, useCallback } from "react";
import { loadJSON, loadText, saveJSON, saveText } from "../utils/storage";

/**
 * Hook for managing a single block field with localStorage persistence.
 * Reads from storage on mount, writes back on change.
 * Handles both string (loadText/saveText) and JSON (loadJSON/saveJSON) automatically.
 */
export function useBlockField<T>(
  blockId: string,
  fieldKey: string,
  fallback: T
): [T, (value: T) => void] {
  const storageKey = `${blockId}:${fieldKey}`;

  const [value, setValue] = useState<T>(() => {
    // Detect type from fallback and use appropriate loader
    if (typeof fallback === "string") {
      return loadText(storageKey, fallback as string) as T;
    }
    return loadJSON(storageKey, fallback);
  });

  const update = useCallback(
    (newValue: T) => {
      // Save to localStorage based on type
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
