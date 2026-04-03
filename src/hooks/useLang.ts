import { useSessionStore } from "../stores/useSessionStore";
import type { Lang } from "../types";

/**
 * Subscribes to language changes from Zustand store.
 * Call this in any component that uses pick() so it re-renders when lang changes.
 */
export function useLang(): Lang {
  return useSessionStore((s) => s.lang);
}
