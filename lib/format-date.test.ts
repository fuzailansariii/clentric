import { describe, expect, it } from "vitest";
import { formatShortAgo } from "./format-date";

// Local-time dates, so results don't depend on the machine's time zone.
const now = new Date(2026, 9, 2, 15, 0);
const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000);

describe("formatShortAgo", () => {
  it("says just now under a minute", () => {
    expect(formatShortAgo(ago(0), now)).toBe("Just now");
    expect(formatShortAgo(new Date(now.getTime() - 59_000), now)).toBe(
      "Just now",
    );
  });

  it("counts minutes, then hours", () => {
    expect(formatShortAgo(ago(1), now)).toBe("1m ago");
    expect(formatShortAgo(ago(59), now)).toBe("59m ago");
    expect(formatShortAgo(ago(60), now)).toBe("1h ago");
    expect(formatShortAgo(ago(23 * 60 + 59), now)).toBe("23h ago");
  });

  it("uses the calendar day for yesterday", () => {
    expect(formatShortAgo(new Date(2026, 9, 1, 9, 0), now)).toBe("Yesterday");
    // Only 26 hours back, but two calendar days ago.
    const earlyMorning = new Date(2026, 9, 2, 1, 0);
    expect(formatShortAgo(new Date(2026, 8, 30, 23, 0), earlyMorning)).toBe(
      "Sep 30",
    );
  });

  it("adds the year only for other years", () => {
    expect(formatShortAgo(new Date(2026, 8, 21), now)).toBe("Sep 21");
    expect(formatShortAgo(new Date(2025, 11, 31), now)).toBe("Dec 31, 2025");
  });
});
