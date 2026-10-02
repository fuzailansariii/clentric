export function formatDate(date: Date | string) {
  const isDateOnly = typeof date === "string";
  const parsed = isDateOnly ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

const RELATIVE_UNITS: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] =
  [
    { unit: "year", seconds: 31536000 },
    { unit: "month", seconds: 2592000 },
    { unit: "day", seconds: 86400 },
    { unit: "hour", seconds: 3600 },
    { unit: "minute", seconds: 60 },
  ];

const relativeFormatter = new Intl.RelativeTimeFormat("en-US", {
  numeric: "auto",
});

// "3 days ago", "2 months ago", etc. Falls back to "just now" for anything under a minute.
export function formatRelativeDate(date: Date) {
  const secondsElapsed = (date.getTime() - Date.now()) / 1000;

  for (const { unit, seconds } of RELATIVE_UNITS) {
    if (Math.abs(secondsElapsed) >= seconds) {
      return relativeFormatter.format(
        Math.round(secondsElapsed / seconds),
        unit,
      );
    }
  }

  return "just now";
}

// "Just now", "5m ago", "2h ago", "Yesterday", then "Sep 21", in the runtime's time zone.
export function formatShortAgo(date: Date, now: Date = new Date()) {
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h ago`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  }).format(date);
}

// Date -> "YYYY-MM-DD" using LOCAL date parts (avoids toISOString's UTC shift bug)
export function dateToFormValue(date: Date | undefined): string {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// "YYYY-MM-DD" -> Date (for pre-filling the calendar)
export function formValueToDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return isNaN(date.getTime()) ? undefined : date;
}
