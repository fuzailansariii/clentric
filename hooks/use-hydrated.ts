"use client";
import { useSyncExternalStore } from "react";

// Nothing to subscribe to — "are we in the browser?" never changes after mount.
const subscribe = () => () => {};

/**
 * false during server render and hydration, true once running in the browser.
 * useSyncExternalStore gives exactly that without a setState inside an effect,
 * and returns true straight away on client-side navigations (no extra render).
 */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
