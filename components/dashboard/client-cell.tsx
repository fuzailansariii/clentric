import { AvatarInitials } from "@/components/ui/avatar-initials";
import { cn } from "@/lib/utils";

/** Small avatar + client name, for dashboard table rows. */
export function ClientCell({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs",
        className,
      )}
    >
      <AvatarInitials name={name} size="xs" shape="circle" />
      <span className="line-clamp-2 break-words">{name}</span>
    </span>
  );
}
