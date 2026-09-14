import { formatDate } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import type { InvoiceDisplayStatus } from "@/lib/get-invoice-display-status";

type Tone = "muted" | "danger" | "success";

const lastDotStyles: Record<Tone, string> = {
  muted: "bg-ink-400",
  danger: "bg-danger-600 ring-3 ring-danger-600/20",
  success: "bg-success-600 ring-3 ring-success-600/20",
};

type TimelineEvent = {
  key: string;
  label: string;
  /** Null for events that aren't a stored timestamp (the Overdue marker). */
  date: Date | null;
  detail: string;
  tone: Tone;
};

export function InvoiceTimeline({
  createdAt,
  sentAt,
  lastReminderSentAt,
  paidAt,
  displayStatus,
  overdueDetail,
}: {
  createdAt: Date;
  sentAt: Date | null;
  lastReminderSentAt: Date | null;
  paidAt: Date | null;
  displayStatus: InvoiceDisplayStatus;
  /** e.g. "20 days late" — only used when displayStatus is "overdue". */
  overdueDetail: string;
}) {
  const dated = (
    key: string,
    label: string,
    date: Date | null,
    tone: Tone,
  ): TimelineEvent | null =>
    date ? { key, label, date, detail: formatDate(date), tone } : null;

  const events: TimelineEvent[] = [
    dated("created", "Created", createdAt, "muted"),
    dated("sent", "Sent to client", sentAt, "muted"),
    dated("reminder", "Reminder sent", lastReminderSentAt, "muted"),
    dated("paid", "Paid in full", paidAt, "success"),
  ]
    .filter((event): event is TimelineEvent => event !== null)
    .sort((a, b) => a.date!.getTime() - b.date!.getTime());

  if (displayStatus === "overdue") {
    events.push({
      key: "overdue",
      label: "Overdue",
      date: null,
      detail: overdueDetail,
      tone: "danger",
    });
  }

  return (
    <div>
      <ol className="grid">
        {events.map((event, index) => {
          const isLast = index === events.length - 1;

          return (
            <li
              key={event.key}
              className="grid min-w-0 grid-cols-[18px_1fr] gap-2.5"
            >
              <div className="flex flex-col items-center">
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-1.25 block size-2.25 shrink-0 rounded-full",
                    isLast ? lastDotStyles[event.tone] : "bg-ink-400",
                  )}
                />
                {!isLast && (
                  <span
                    aria-hidden="true"
                    className="bg-foreground/12 mt-1 block w-px flex-1"
                  />
                )}
              </div>
              <div className={cn("min-w-0", !isLast && "pb-4.5")}>
                <p className="text-[13.5px] leading-[1.3] font-medium">
                  {event.label}
                </p>
                {/* Formatted in the runtime's timezone — server and browser
                    can land on different calendar days near midnight. */}
                <p
                  className="text-muted-foreground mt-0.5 font-mono text-xs"
                  suppressHydrationWarning
                >
                  {event.detail}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {displayStatus === "draft" && (
        <p className="text-muted-foreground mt-1.5 text-[12.5px] leading-[1.55]">
          Nothing else has happened yet — send the invoice to start the trail.
        </p>
      )}
    </div>
  );
}
