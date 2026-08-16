import { cn } from "@/lib/utils";

type TabButtonProps = {
  id: string;
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
};

export function TabButton({
  id,
  label,
  count,
  isActive,
  onClick,
}: TabButtonProps) {
  return (
    <button
      id={id}
      role="tab"
      type="button"
      aria-selected={isActive}
      aria-controls="client-section-panel"
      tabIndex={isActive ? 0 : -1}
      onClick={onClick}
      className={cn(
        "flex items-center font-mono tracking-tighter gap-2 border-b-2 px-3 py-3 text-[13px]",
        isActive
          ? "border-primary text-foreground font-medium"
          : "text-muted-foreground hover:text-foreground border-transparent",
      )}
    >
      {label}
      <span
        className={cn(
          "rounded-md px-1.5 py-0.5 font-mono text-xs font-medium",
          isActive
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  );
}
