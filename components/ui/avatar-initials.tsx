import { cn } from "@/lib/utils";

type AvatarSize = "sm" | "md" | "lg";
type AvatarVariant = "neutral" | "colored";
type AvatarShape = "square" | "circle";

const sizeStyles: Record<AvatarSize, string> = {
  sm: "h-7 w-7 text-[10px]",
  md: "h-9 w-9 text-sm",
  lg: "h-11 w-11 text-base",
};

const shapeStyles: Record<AvatarShape, string> = {
  square: "rounded-xl",
  circle: "rounded-full",
};

// global.css tokens (--color-ledger-500,
// --color-amber-500, --color-success-600, --color-paper-100) instead of
// avatars pick it up automatically.
const COLOR_PALETTE = [
  "var(--color-ledger-500)",
  "var(--color-amber-500)",
  "var(--color-success-600)",
  "var(--color-paper-100)",
] as const;
const ON_COLOR_TEXT = "var(--color-ink-950)";

function getInitials(name: string) {
  const parts = name.trim().split(" ").filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

// Deterministic: the same name always hashes to the same palette color, so a
// given client's avatar color stays stable across renders and sessions.
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
  /** "neutral" = gray, matches surrounding UI (sidebar/footer, single-user contexts).
   *  "colored" = deterministic color per name, for scanning many rows at once (tables/lists). */
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
      <span className="text-secondary-foreground font-mono font-extrabold">
        {initials}
      </span>
    </div>
  );
}
