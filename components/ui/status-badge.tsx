import { cn } from "@/lib/utils";

type Status = "success" | "warning" | "danger" | "neutral";

const statusStyles: Record<Status, string> = {
  success: "bg-success-100 text-success-600",
  warning: "bg-warning-100 text-warning-600",
  danger: "bg-danger-100 text-danger-600",
  neutral: "bg-paper-100 text-ink-600",
};

export function Badge({
  status,
  children,
}: {
  status: Status;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        statusStyles[status],
      )}
    >
      {children}
    </span>
  );
}
