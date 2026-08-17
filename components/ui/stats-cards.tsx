import { cn } from "@/lib/utils";

type StatItem = {
  label: string;
  value: string | number;
  hint: string;
};

export function StatsCards({ items }: { items: StatItem[] }) {
  return (
    <div className="border-border bg-paper-50 dark:bg-ink-900 grid grid-cols-2 border-b sm:grid-cols-4">
      {items.map((item, i) => {
        const isLastInMobileRow = i % 2 === 1;
        const isInLastMobileRow =
          i >= items.length - (items.length % 2 === 0 ? 2 : 1);
        const isLastInDesktopRow = i === items.length - 1;

        return (
          <div
            key={item.label}
            className={cn(
              "border-border px-5 py-4",
              !isLastInMobileRow && "border-r",
              !isInLastMobileRow && "border-b",
              "sm:border-b-0",
              !isLastInDesktopRow && "sm:border-r",
            )}
          >
            <div className="text-muted-foreground font-mono text-[10px] font-medium tracking-[0.06rem] uppercase">
              {item.label}
            </div>
            <div className="mt-1 text-lg font-semibold">{item.value}</div>
            <div className="text-muted-foreground mt-0.5 text-xs">
              {item.hint}
            </div>
          </div>
        );
      })}
    </div>
  );
}
