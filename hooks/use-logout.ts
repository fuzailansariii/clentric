"use client";

import { useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { logoutAction } from "@/app/(auth)/action";

const OFFLINE = "Could not log out. Check your connection and try again.";

/** Logs out and stays pending until the next page is on screen. */
export function useLogout(
  destination: "/login" | "/",
  onError?: (message: string) => void,
) {
  const [isLoggingOut, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const fail = (message: string) => {
    setError(message);
    onError?.(message);
  };

  const logout = () => {
    if (isLoggingOut) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await logoutAction(destination);
        if (!result.success) fail(result.error);
      } catch (caught) {
        // Success arrives as Next's redirect signal: let the router have it.
        unstable_rethrow(caught);
        fail(OFFLINE);
      }
    });
  };

  return { logout, isLoggingOut, error };
}
