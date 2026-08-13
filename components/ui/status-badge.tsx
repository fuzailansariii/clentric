import { cn } from "@/lib/utils";

type Status = "info" | "success" | "warning" | "danger" | "neutral";

const statusStyles: Record<Status, string> = {
  info: "bg-primary/12 text-primary", // e.g. "Active"
  success: "bg-success-600/12 text-success-600", // e.g. "New user"
  warning: "bg-warning-600/12 text-warning-600", // e.g. "Frequent user"
  danger: "bg-danger-600/12 text-danger-600", // e.g. "Overdue"
  neutral: "bg-foreground/8 text-muted-foreground", // e.g. "Inactive"
};

export function StatusBadge({
  status,
  children,
  className,
}: {
  status: Status;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        statusStyles[status],
        className,
      )}
    >
      {children}
    </span>
  );
}
