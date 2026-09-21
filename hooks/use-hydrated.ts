"use client";
import { useSyncExternalStore } from "react";

// Hydration is not something that changes over time, so there is nothing to
// subscribe to — the unsubscribe function is a no-op.
const subscribe = () => () => {};

/**
 * False while rendering on the server and during hydration, true afterwards.
 *
 * useSyncExternalStore is the right tool here rather than a
 * useState + useEffect pair: React reads the server snapshot while hydrating
 * and the client snapshot after, without the extra render that setting state
 * inside an effect would cause.
 */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
