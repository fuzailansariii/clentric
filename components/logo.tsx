import { cn } from "@/lib/utils";

interface LogoProps {
  title?: string;
  fontSize?: number | string;
  className?: string;
}

export function Logo({
  title = "Clentric",
  fontSize = 24,
  className,
}: LogoProps) {
  return (
    <span
      className={cn(
        "font-mono font-extrabold tracking-tight select-none",
        "text-foreground",
        className,
      )}
      style={{
        fontSize: typeof fontSize === "number" ? `${fontSize}px` : fontSize,
      }}
      aria-label={title}
    >
      {title}
    </span>
  );
}
