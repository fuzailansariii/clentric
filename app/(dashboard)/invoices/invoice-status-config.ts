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
