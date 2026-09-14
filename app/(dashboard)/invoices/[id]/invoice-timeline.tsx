import { BellIcon, CheckIcon, FileTextIcon, SendIcon } from "lucide-react";
import { formatDate, formatRelativeDate } from "@/lib/format-date";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "info" | "warning" | "success";

const toneStyles: Record<Tone, string> = {
  neutral: "bg-foreground/8 text-muted-foreground",
  info: "bg-primary/12 text-primary",
  warning: "bg-warning-600/12 text-warning-600",
  success: "bg-success-600/12 text-success-600",
};

type TimelineEvent = {
  key: string;
  date: Date;
  label: string;
  icon: typeof FileTextIcon;
  tone: Tone;
};

/**
 * What happened to this invoice, in order — built from timestamps already on
 * the row (createdAt/sentAt/lastReminderSentAt/paidAt), not a separate
 * activity log. Reverting a status (undo-send, revert paid→sent) clears the
 * matching timestamp server-side, so this only ever shows the current true
 * lifecycle, never a stale "sent" after an undo.
 *
 * Reminders are tracked as a single "last sent" timestamp, not a full
 * history, so a client reminded three times still shows one "Reminder sent"
 * entry — the most recent.
 */
export function InvoiceTimeline({
  createdAt,
  sentAt,
  lastReminderSentAt,
  paidAt,
}: {
  createdAt: Date;
  sentAt: Date | null;
  lastReminderSentAt: Date | null;
  paidAt: Date | null;
}) {
  const events: TimelineEvent[] = [
    {
      key: "created",
      date: createdAt,
      label: "Invoice created",
      icon: FileTextIcon,
      tone: "neutral",
    },
    sentAt && {
      key: "sent",
      date: sentAt,
      label: "Sent to client",
      icon: SendIcon,
      tone: "info" as const,
    },
    lastReminderSentAt && {
      key: "reminder",
      date: lastReminderSentAt,
      label: "Reminder sent",
      icon: BellIcon,
      tone: "warning" as const,
    },
    paidAt && {
      key: "paid",
      date: paidAt,
      label: "Marked as paid",
      icon: CheckIcon,
      tone: "success" as const,
    },
  ]
    .filter((event): event is TimelineEvent => Boolean(event))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div>
      {events.map((event, index) => (
        <div key={event.key} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                toneStyles[event.tone],
              )}
            >
              <event.icon className="h-3.5 w-3.5" />
            </span>
            {index < events.length - 1 && (
              <span
                aria-hidden="true"
                className="bg-border mt-1 w-px flex-1"
              />
            )}
          </div>
          <div className={cn(index < events.length - 1 ? "pb-4" : undefined)}>
            <p className="text-sm font-medium">{event.label}</p>
            {/* Relative time is read from the clock — server/client can
                render a slightly different "x ago" at the same instant. */}
            <p
              className="text-muted-foreground text-xs"
              suppressHydrationWarning
            >
              {formatDate(event.date)} · {formatRelativeDate(event.date)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
