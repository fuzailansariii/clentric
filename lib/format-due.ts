/**
 * A whole-day difference (negative = in the past) as a short label:
 * "Due today", "Due in 9 days", "20 days late".
 *
 * The day count comes from SQL (`due_date - current_date`) rather than
 * Date.now() here, so rendering stays pure and server/client markup match.
 */
export function formatDaysUntilDue(days: number): string {
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days > 1) return `Due in ${days} days`;
  if (days === -1) return "1 day late";
  return `${Math.abs(days)} days late`;
}

/** "Sep 11" — for recent dates where the year is noise. */
export function formatShortDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

/** "Oct 2" from a YYYY-MM-DD date, the same day in every timezone. */
export function formatDayValue(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date.slice(0, 10)}T00:00:00Z`));
}
