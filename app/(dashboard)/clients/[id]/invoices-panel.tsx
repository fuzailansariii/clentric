import { cn } from "@/lib/utils";

export function InvoicesPanel({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "border-border rounded-xl rounded-t-none border",
        className,
      )}
    >
      <div className="flex min-h-40 items-center justify-center px-6 py-12">
        <p className="text-muted-foreground text-sm">
          Invoices are coming soon.
        </p>
      </div>
    </div>
  );
}
