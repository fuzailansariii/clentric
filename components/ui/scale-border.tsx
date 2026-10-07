import { cn } from "@/lib/utils";

const HorizontalScale = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "border-muted-foreground/20 h-8 w-full border-y bg-[repeating-linear-gradient(315deg,color-mix(in_oklab,var(--muted-foreground)_25%,transparent)_0,color-mix(in_oklab,var(--muted-foreground)_25%,transparent)_1px,transparent_1px,transparent_50%)] bg-size-[10px_10px]",
        className,
      )}
    />
  );
};
function VerticalScale({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "border-muted-foreground/20 h-full w-6 border-x bg-[repeating-linear-gradient(315deg,color-mix(in_oklab,var(--muted-foreground)_20%,transparent)_0,color-mix(in_oklab,var(--muted-foreground)_20%,transparent)_1px,transparent_1px,transparent_50%)] bg-size-[10px_10px]",
        className,
      )}
    />
  );
}

export { HorizontalScale, VerticalScale };
