import { cn } from "@/lib/utils";

type StatItem = {
  label: string;
  value: string | number;
  hint: string;
};

export function StatsCards({ items }: { items: StatItem[] }) {
  return (
    <div className="border-border bg-paper-50 dark:bg-ink-900 grid grid-cols-2 overflow-hidden rounded-lg border sm:grid-cols-4">
      {items.map((item, i) => {
        const isLastInMobileRow = i % 2 === 1;
        const isLastMobileRow =
          i >= items.length - (items.length % 2 === 0 ? 2 : 1);
        const isLastDesktop = i === items.length - 1;

        return (
          <div
            key={item.label}
            className={cn(
              "px-5 py-4 transition-colors",
              "hover:bg-paper-100 dark:hover:bg-ink-800/60",

              !isLastInMobileRow && "border-border border-r",
              !isLastMobileRow && "border-border border-b",

              "sm:border-b-0",
              !isLastDesktop && "sm:border-border sm:border-r",
            )}
          >
            <div className="text-muted-foreground font-mono text-[10px] font-medium tracking-[0.08em] uppercase">
              {item.label}
            </div>

            <div className="text-foreground mt-1.5 text-2xl font-semibold tracking-tight">
              {item.value}
            </div>

            <div className="text-muted-foreground mt-0.5 text-xs">
              {item.hint}
            </div>
          </div>
        );
      })}
    </div>
  );
}
