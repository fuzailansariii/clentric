"use client";

import { useSyncExternalStore } from "react";

import { formatDate, formatShortAgo } from "@/lib/format-date";

const MINUTE = 60_000;

function subscribe(onTick: () => void) {
  const id = setInterval(onTick, MINUTE);
  return () => clearInterval(id);
}

// Rounded to the minute so the snapshot stays stable between ticks.
const getMinute = () => Math.floor(Date.now() / MINUTE);
const getServerMinute = () => null;

/** Relative time in the viewer's time zone, refreshed every minute. */
export function ActivityTime({
  date,
  initialText,
}: {
  date: string;
  /** Server-rendered text, reused during hydration to avoid a mismatch. */
  initialText: string;
}) {
  const minute = useSyncExternalStore(subscribe, getMinute, getServerMinute);
  const parsed = new Date(date);

  return (
    <time
      dateTime={date}
      title={minute === null ? undefined : formatDate(parsed)}
      className="text-muted-foreground shrink-0 text-xs tabular-nums"
    >
      {minute === null
        ? initialText
        : formatShortAgo(parsed, new Date(minute * MINUTE))}
    </time>
  );
}
