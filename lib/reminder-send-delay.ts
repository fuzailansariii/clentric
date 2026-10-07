// Grace window between clicking "Send reminder" and the reminder actually
// going out — long enough to catch a mis-click via the "Undo" toast, short
// enough that it still feels like it happened now. Mirrors the Gmail
// "Undo Send" convention (theirs defaults to 5s, configurable up to 30s).
export const REMINDER_SEND_DELAY_MS = 6000;
