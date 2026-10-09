import { Skeleton as Bone } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Placeholders shaped like each dashboard section, so real content drops in without a jump.

const CARD = "border-border bg-card rounded-xl border shadow-sm";

export function WelcomeSkeleton() {
  return (
    <div>
      <Bone className="h-7 w-56" />
      <Bone className="mt-2.5 h-4 w-80 max-w-full" />
    </div>
  );
}

export function AttentionSkeleton() {
  return (
    <div className={cn(CARD, "divide-border divide-y")}>
      <div className="px-4 py-3.5">
        <Bone className="h-4 w-40" />
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
          <Bone className="size-8 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Bone className="h-3 w-1/3" />
            <Bone className="h-2.5 w-1/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatTilesSkeleton() {
  return (
    <div className="@container">
      <div className="border-border bg-border grid grid-cols-2 gap-px overflow-hidden rounded-xl border shadow-sm @4xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card space-y-2.5 px-4 py-4">
            <Bone className="h-3 w-20" />
            <Bone className="h-6 w-24" />
            <Bone className="h-2.5 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function RevenueSkeleton() {
  return (
    <div className={cn(CARD, "px-4 py-4")}>
      <Bone className="h-4 w-32" />
      <Bone className="mt-5 h-48 w-full rounded-lg" />
    </div>
  );
}

export function TablesSkeleton() {
  return (
    <div className="@container">
      <div className="grid gap-6 @3xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className={cn(CARD, "divide-border divide-y")}>
            <div className="px-4 py-3.5">
              <Bone className="h-4 w-28" />
            </div>
            {Array.from({ length: 3 }).map((_, j) => (
              <div
                key={j}
                className="flex items-center justify-between gap-4 px-4 py-3.5"
              >
                <Bone className="h-3 w-2/5" />
                <Bone className="h-3 w-16" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ActivitySkeleton() {
  return (
    <div className={cn(CARD, "px-4 py-4")}>
      <Bone className="h-4 w-32" />
      <div className="mt-4 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Bone className="size-7 rounded-full" />
            <div className="flex-1 space-y-2">
              <Bone className="h-3 w-1/2" />
              <Bone className="h-2.5 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
