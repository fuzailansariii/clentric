"use client";

import { createContext, useContext } from "react";

export type WaitlistKind = "beta" | "agency";

export const WaitlistContext = createContext<(kind?: WaitlistKind) => void>(
  () => {},
);

/** Opens the waitlist dialog from any button on the landing page. */
export function useOpenWaitlist() {
  return useContext(WaitlistContext);
}
