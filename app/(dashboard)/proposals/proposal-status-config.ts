/**
 * `expired` is a display status as much as a stored one: a proposal that is
 * still `sent` or `viewed` past its expiresAt reads as expired everywhere,
 * without a job having to rewrite the row. See displayStatus in queries.ts.
 */
export type ProposalStatus =
  "draft" | "sent" | "viewed" | "accepted" | "rejected" | "revoked" | "expired";

export const proposalStatusConfig: Record<
  ProposalStatus,
  {
    label: string;
    variant: "info" | "success" | "warning" | "danger" | "neutral";
    dim?: boolean;
    dotColor?: string;
  }
> = {
  draft: {
    label: "Draft",
    variant: "neutral",
    dim: true,
    dotColor: "bg-muted-foreground",
  },
  sent: {
    label: "Sent",
    variant: "info",
    dotColor: "bg-blue-500",
  },
  // The client has opened it, so the ball is in their court — worth a colour
  // that reads as "waiting on someone".
  viewed: {
    label: "Viewed",
    variant: "warning",
    dotColor: "bg-amber-500",
  },
  accepted: {
    label: "Accepted",
    variant: "success",
    dotColor: "bg-emerald-500",
  },
  rejected: {
    label: "Declined",
    variant: "danger",
    dotColor: "bg-rose-500",
  },
  revoked: {
    label: "Revoked",
    variant: "neutral",
    dim: true,
    dotColor: "bg-muted-foreground",
  },
  expired: {
    label: "Expired",
    variant: "neutral",
    dim: true,
    dotColor: "bg-muted-foreground",
  },
};

// Only amounts worth a second look get colour. Nothing was agreed on a draft,
// and a revoked or expired proposal's figure no longer means anything.
export const proposalAmountColor: Record<ProposalStatus, string | undefined> = {
  draft: "text-muted-foreground",
  sent: undefined,
  viewed: undefined,
  accepted: undefined,
  rejected: "text-muted-foreground",
  revoked: "text-muted-foreground",
  expired: "text-muted-foreground",
};
