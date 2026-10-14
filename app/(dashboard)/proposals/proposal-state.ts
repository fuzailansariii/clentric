import type { StatusTone } from "@/components/ui/status-badge";
import { formatShortDate } from "@/lib/format-due";
import type { ProposalStatus } from "./proposal-status-config";

/** The display status, plus "expiring": out with the client, link ends within 3 days. */
export type ProposalState =
  Exclude<ProposalStatus, "rejected"> | "declined" | "expiring";

export const EXPIRING_DAYS = 3;

export const proposalStateConfig: Record<
  ProposalState,
  { label: string; tone: StatusTone }
> = {
  draft: { label: "Draft", tone: "neutral" },
  sent: { label: "Sent", tone: "info" },
  viewed: { label: "Viewed", tone: "warning" },
  expiring: { label: "Expiring soon", tone: "warning" },
  accepted: { label: "Accepted", tone: "success" },
  declined: { label: "Declined", tone: "danger" },
  revoked: { label: "Revoked", tone: "neutral" },
  expired: { label: "Expired", tone: "neutral" },
};

export function proposalState(row: {
  status: ProposalStatus;
  expiresInDays: number | null;
}): ProposalState {
  if (row.status === "rejected") return "declined";
  const open = row.status === "sent" || row.status === "viewed";
  if (
    open &&
    row.expiresInDays !== null &&
    row.expiresInDays <= EXPIRING_DAYS
  ) {
    return "expiring";
  }
  return row.status;
}

/** "today", "yesterday", "3 days ago", then the date. */
function ago(days: number | null, date: Date | null) {
  if (days === null || date === null) return "";
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return formatShortDate(date);
}

/** The activity line: "Edited 2 days ago", "Viewed yesterday", "Link expires Oct 14". */
export function proposalActivity(
  state: ProposalState,
  row: {
    updatedAt: Date;
    daysSinceUpdate: number;
    viewedAt: Date | null;
    daysSinceViewed: number | null;
    expiresAt: Date | null;
    acceptedAt: Date | null;
    rejectedAt: Date | null;
    revokedAt: Date | null;
  },
): string {
  const on = (date: Date | null) => (date ? formatShortDate(date) : "");
  switch (state) {
    case "draft":
      return `Edited ${ago(row.daysSinceUpdate, row.updatedAt)}`;
    case "sent":
      return "Not opened yet";
    case "viewed":
      return `Viewed ${ago(row.daysSinceViewed, row.viewedAt)}`;
    case "expiring":
      return `Link expires ${on(row.expiresAt)}`;
    case "accepted":
      return `Accepted ${on(row.acceptedAt)}`;
    case "declined":
      return `Declined ${on(row.rejectedAt)}`;
    case "revoked":
      return `Revoked ${on(row.revokedAt)}`;
    case "expired":
      return `Expired ${on(row.expiresAt)}`;
  }
}
