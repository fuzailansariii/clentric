type StatItem = {
  label: string;
  value: string | number;
  hint: string;
};

export function StatsCards({ items }: { items: StatItem[] }) {
  return (
    <div className="border-border divide-border bg-paper-50 grid grid-cols-2 divide-x border-b sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="px-5 py-4">
          <div className="text-muted-foreground font-mono text-[10px] font-medium tracking-[0.06rem] uppercase">
            {item.label}
          </div>
          <div className="mt-1 text-lg font-semibold">{item.value}</div>
          <div className="text-muted-foreground mt-0.5 text-xs">
            {item.hint}
          </div>
        </div>
      ))}
    </div>
  );
}
