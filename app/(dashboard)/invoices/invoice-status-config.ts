export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

export const invoiceStatusConfig: Record<
  InvoiceStatus,
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
    label: "Pending",
    variant: "warning",
    dotColor: "bg-amber-500",
  },
  paid: {
    label: "Paid",
    variant: "success",
    dotColor: "bg-emerald-500",
  },
  overdue: {
    label: "Overdue",
    variant: "danger",
    dotColor: "bg-rose-500",
  },
};

// Only amounts that need a second look get color: overdue reads red, drafts
// are muted because nothing has been billed yet.
export const invoiceAmountColor: Record<InvoiceStatus, string | undefined> = {
  draft: "text-muted-foreground",
  sent: undefined,
  paid: undefined,
  overdue: "text-danger-600",
};
