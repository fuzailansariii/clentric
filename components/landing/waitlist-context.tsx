"use client";

import { createContext, useContext } from "react";

export const WaitlistContext = createContext<() => void>(() => {});

/** Opens the Agency waitlist dialog from any button on the landing page. */
export function useOpenWaitlist() {
  return useContext(WaitlistContext);
}
