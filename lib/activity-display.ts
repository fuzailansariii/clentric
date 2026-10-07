import {
  Banknote,
  BellRing,
  Check,
  Eye,
  FilePlus,
  FileText,
  Flag,
  FolderPlus,
  Send,
  Undo2,
  UserPlus,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";

import type { ActivityItem } from "@/app/(dashboard)/dashboard/queries";
import type { StatusTone } from "@/components/ui/status-badge";
import { ACTIVITY_ACTIONS, type ActivityAction } from "@/lib/activity-actions";
import { formatCurrency } from "@/lib/format-currency";
import { formatInvoiceNumber } from "@/lib/format-invoice-number";

type Parts = {
  client: string;
  invoice: string;
  proposal: string;
  project: string;
  milestone: string;
  amount: string | null;
};

type Display = {
  icon: LucideIcon;
  tone: StatusTone;
  /** The bold actor, then the muted rest of the sentence. */
  text: (p: Parts) => [actor: string, rest: string];
};

export const ACTIVITY_DISPLAY = {
  "client.created": {
    icon: UserPlus,
    tone: "neutral",
    text: (p) => ["You", `added ${p.client} as a client`],
  },
  "invoice.created": {
    icon: FilePlus,
    tone: "neutral",
    text: (p) => ["You", `created ${p.invoice} for ${p.client}`],
  },
  "invoice.sent": {
    icon: Send,
    tone: "info",
    text: (p) => ["You", `sent ${p.invoice} to ${p.client}`],
  },
  "invoice.reminder_sent": {
    icon: BellRing,
    tone: "info",
    text: (p) => ["You", `reminded ${p.client} about ${p.invoice}`],
  },
  "invoice.paid": {
    icon: Banknote,
    tone: "success",
    text: (p) => [
      p.invoice,
      p.amount ? `marked paid · ${p.amount}` : "marked paid",
    ],
  },
  "invoice.payment_claimed": {
    icon: Wallet,
    tone: "warning",
    text: (p) => [p.client, `says they paid ${p.invoice}`],
  },
  "proposal.created": {
    icon: FileText,
    tone: "neutral",
    text: (p) => ["You", `drafted “${p.proposal}” for ${p.client}`],
  },
  "proposal.sent": {
    icon: Send,
    tone: "info",
    text: (p) => ["You", `sent “${p.proposal}” to ${p.client}`],
  },
  "proposal.revoked": {
    icon: Undo2,
    tone: "neutral",
    text: (p) => ["You", `withdrew “${p.proposal}”`],
  },
  "proposal.viewed": {
    icon: Eye,
    tone: "info",
    text: (p) => [p.client, `viewed “${p.proposal}”`],
  },
  "proposal.accepted": {
    icon: Check,
    tone: "success",
    text: (p) => [p.client, `accepted “${p.proposal}”`],
  },
  "proposal.declined": {
    icon: X,
    tone: "danger",
    text: (p) => [p.client, `declined “${p.proposal}”`],
  },
  "project.created": {
    icon: FolderPlus,
    tone: "neutral",
    text: (p) => ["You", `started “${p.project}” for ${p.client}`],
  },
  "milestone.completed": {
    icon: Flag,
    tone: "neutral",
    text: (p) => [p.project, `milestone “${p.milestone}” completed`],
  },
} satisfies Record<ActivityAction, Display>;

export function hrefFor(item: ActivityItem) {
  switch (ACTIVITY_ACTIONS[item.action]) {
    case "client":
      return `/clients/${item.entityId}`;
    case "invoice":
      return `/invoices/${item.entityId}`;
    case "proposal":
      return `/proposals/${item.entityId}`;
    case "project":
      return `/projects/${item.entityId}`;
    case "milestone":
      return `/projects/${item.projectId}`;
  }
}

export function partsFor(item: ActivityItem): Parts {
  return {
    client: item.clientName ?? "A client",
    invoice:
      item.invoiceNumber !== null && item.numberPrefix !== null
        ? formatInvoiceNumber(item.invoiceNumber, item.numberPrefix)
        : "an invoice",
    proposal: item.proposalTitle ?? "Untitled",
    project: item.projectTitle ?? "Untitled",
    milestone: item.milestoneTitle ?? "Untitled",
    amount:
      item.invoiceTotal !== null
        ? formatCurrency(item.invoiceTotal, item.invoiceCurrency ?? "USD")
        : null,
  };
}

/** Icon, tone, sentence and link for one feed row. */
export function describeActivity(item: ActivityItem) {
  const { icon, tone, text } = ACTIVITY_DISPLAY[item.action];
  const [actor, rest] = text(partsFor(item));
  return { icon, tone, actor, rest, href: hrefFor(item) };
}
