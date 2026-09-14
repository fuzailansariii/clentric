"use client";

import { useEffect, useState } from "react";

/**
 * True while `since` is within `windowMs` of now. Re-checks against the
 * clock once a second so a disabled button (e.g. "Undo send") flips off on
 * its own once the window closes, without needing a page refresh — the
 * interval stops itself once that happens.
 *
 * Reading the clock (`Date.now()`) only happens inside the effect/timers,
 * never during render — render must stay a pure function of props/state.
 */
export function useWithinWindow(
  since: Date | string | null,
  windowMs: number,
): boolean {
  const [withinWindow, setWithinWindow] = useState(false);

  useEffect(() => {
    const sinceMs = since ? new Date(since).getTime() : null;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const tick = () => {
      const stillWithin = sinceMs !== null && Date.now() - sinceMs < windowMs;
      setWithinWindow(stillWithin);
      if (!stillWithin && intervalId !== undefined) clearInterval(intervalId);
    };

    // Deferred via setTimeout (rather than called straight from the effect
    // body) so the state update happens from a genuine async callback.
    const timeoutId = setTimeout(() => {
      tick();
      if (sinceMs !== null) {
        intervalId = setInterval(tick, 1000);
      }
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId !== undefined) clearInterval(intervalId);
    };
  }, [since, windowMs]);

  return withinWindow;
}
