import { cn } from "@/lib/utils";

type AvatarSize = "xs" | "sm" | "md" | "lg";
type AvatarVariant = "neutral" | "colored" | "accent";
type AvatarShape = "square" | "circle";

const sizeStyles: Record<AvatarSize, string> = {
  xs: "size-5 text-[8px]",
  sm: "h-7 w-7 text-[10px]",
  md: "h-9 w-9 text-sm",
  lg: "h-11 w-11 text-base",
};

const shapeStyles: Record<AvatarShape, string> = {
  square: "rounded-xl",
  circle: "rounded-full",
};

const COLOR_PALETTE = [
  "var(--color-ledger-500)",
  "var(--color-amber-500)",
  "var(--color-success-600)",
  "var(--color-paper-100)",
] as const;
const ON_COLOR_TEXT = "var(--color-ink-950)";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hashToColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length];
}

type AvatarInitialsProps = {
  name: string;
  size?: AvatarSize;
  variant?: AvatarVariant;
  shape?: AvatarShape;
  className?: string;
};

export function AvatarInitials({
  name,
  size = "md",
  variant = "neutral",
  shape = "square",
  className,
}: AvatarInitialsProps) {
  const initials = getInitials(name);

  if (variant === "accent") {
    return (
      <div
        className={cn(
          "bg-accent text-accent-foreground flex shrink-0 items-center justify-center font-semibold tracking-[0.02em]",
          sizeStyles[size],
          shapeStyles[shape],
          className,
        )}
      >
        {initials}
      </div>
    );
  }

  if (variant === "colored") {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center border border-black/10",
          sizeStyles[size],
          shapeStyles[shape],
          className,
        )}
        style={{ backgroundColor: hashToColor(name) }}
      >
        <span
          className="font-mono font-extrabold"
          style={{ color: ON_COLOR_TEXT }}
        >
          {initials}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-secondary border-border flex shrink-0 items-center justify-center border",
        sizeStyles[size],
        shapeStyles[shape],
        className,
      )}
    >
      <span
        className={cn(
          "text-secondary-foreground",
          size === "xs"
            ? "font-sans font-semibold"
            : "font-mono font-extrabold",
        )}
      >
        {initials}
      </span>
    </div>
  );
}
