// "Undo send" (revert a sent invoice back to draft) is only allowed for a
// short grace window after it went out — past that, assume the client may
// have already seen it, so reverting the status would misrepresent reality.
// Shared by the server action (source of truth) and the client hook that
// ticks the button's disabled state live.
export const UNDO_SEND_WINDOW_MS = 5 * 60 * 1000;

export function isWithinUndoSendWindow(sentAt: Date | string | null): boolean {
  if (!sentAt) return false;

  const sent = typeof sentAt === "string" ? new Date(sentAt) : sentAt;
  return Date.now() - sent.getTime() < UNDO_SEND_WINDOW_MS;
}
