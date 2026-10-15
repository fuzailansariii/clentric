import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { customButtonClasses } from "@/components/ui/custom-button";
import { cn } from "@/lib/utils";

/** Accepting sends the deposit invoice at once, with the details frozen at send. */
export const DEPOSIT_NO_PAYMENT =
  "Your client won't see how to pay the deposit. Accepting emails the deposit invoice straight away, so add a bank account, PayPal or Wise before you send this.";

export function DepositPaymentWarning({ className }: { className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        "border-warning-600/30 bg-warning-600/10 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3.5 text-[13px]",
        className,
      )}
    >
      <p className="flex min-w-0 flex-1 basis-60 items-start gap-2">
        <AlertTriangle
          aria-hidden="true"
          className="text-warning-600 mt-0.5 size-4 shrink-0"
        />
        <span>{DEPOSIT_NO_PAYMENT}</span>
      </p>
      <Link
        href="/settings/business"
        className={customButtonClasses("secondary", "sm")}
      >
        Set up payment methods
      </Link>
    </div>
  );
}
