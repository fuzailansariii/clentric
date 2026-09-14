// Reminders are capped at once per rolling 24h window per invoice — see
// sendReminderAction (server-side source of truth) and the row/detail
// actions (client-side, so the button reflects the cooldown before you click).
export const REMINDER_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function isReminderOnCooldown(
  lastReminderSentAt: Date | string | null,
): boolean {
  if (!lastReminderSentAt) return false;

  const last =
    typeof lastReminderSentAt === "string"
      ? new Date(lastReminderSentAt)
      : lastReminderSentAt;

  return Date.now() - last.getTime() < REMINDER_COOLDOWN_MS;
}
