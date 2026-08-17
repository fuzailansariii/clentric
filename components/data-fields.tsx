type DataStatProps = {
  label: string;
  value: string | null | undefined;
  href?: string;
  editing?: boolean;
  onChange?: (value: string) => void;
  type?: "text" | "email" | "tel";
};

export function DataStat({
  label,
  value,
  href,
  editing = false,
  onChange,
  type = "text",
}: DataStatProps) {
  return (
    <div>
      <dt className="text-muted-foreground font-mono text-[10.5px] font-medium tracking-[0.06em] uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm">
        {editing ? (
          <input
            type={type}
            value={value ?? ""}
            onChange={(e) => onChange?.(e.target.value)}
            className="border-input bg-background w-full rounded-md border px-2 py-1 text-sm"
          />
        ) : !value ? (
          <span className="text-muted-foreground">—</span>
        ) : href ? (
          <a href={href} className="text-primary hover:underline">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
