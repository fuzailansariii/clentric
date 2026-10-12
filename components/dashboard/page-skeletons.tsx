import type { CSSProperties, ReactNode } from "react";
import DashboardContainer from "@/components/dashboard/container";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Loading screens for the app pages. Each mirrors its page's real layout and
// breakpoints, so the content drops in without moving anything.

const CARD = "border-border bg-card rounded-xl border shadow-sm";

/** Invisible text on a pulsing block: same line height as the real text. */
function TextBone({ text, className }: { text: string; className?: string }) {
  return (
    <span className={cn("block min-w-0", className)}>
      <span className="bg-foreground/8 dark:bg-foreground/12 animate-pulse rounded text-transparent motion-reduce:animate-none">
        {text}
      </span>
    </span>
  );
}

/** Matches PageHeader on a detail or form page (back button, title, subtitle). */
export function DetailHeaderSkeleton({
  breadcrumbs = true,
  subtitle = true,
}: {
  breadcrumbs?: boolean;
  subtitle?: boolean;
}) {
  return (
    <header className="border-border bg-background border-b" aria-hidden="true">
      <div className="px-4 py-3 sm:px-5 lg:px-6">
        {breadcrumbs && (
          <TextBone
            text="Dashboard / Section / Item"
            className="w-fit font-mono text-xs"
          />
        )}
        <div
          className={cn(
            "flex min-w-0 items-center gap-2.5 sm:gap-3",
            breadcrumbs && "mt-2",
          )}
        >
          <Skeleton className="size-9 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1">
            <TextBone
              text="Loading the page title"
              className="font-space text-base font-bold"
            />
            {subtitle && (
              <TextBone
                text="Loading subtitle"
                className="mt-0.5 text-xs sm:text-[13px]"
              />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

/** Status tabs + search, table rows (desktop) or a stacked list (phone), pagination. */
export function ListSkeleton({
  summary = false,
  mark = "circle",
}: {
  /** The one-line money strip some list pages show above the table. */
  summary?: boolean;
  mark?: "circle" | "square";
}) {
  const markClass = cn(
    "size-9 shrink-0",
    mark === "circle" ? "rounded-full" : "rounded-lg",
  );
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-4">
      {summary && (
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-baseline gap-2">
              <Skeleton className="h-2.5 w-14" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      )}

      <div className="@container w-full">
        <div className="@[640px]:border-border @[640px]:bg-card flex flex-col gap-3 @[640px]:gap-0 @[640px]:overflow-clip @[640px]:rounded-xl @[640px]:border">
          <div className="@[640px]:border-border flex flex-col gap-2 @[640px]:flex-row @[640px]:items-center @[640px]:justify-between @[640px]:border-b @[640px]:px-4 @[640px]:py-3">
            <Skeleton className="h-9 w-full rounded-lg @[640px]:order-last @[640px]:h-8 @[640px]:w-56" />
            <div className="flex gap-1.5 overflow-hidden">
              {[14, 16, 18, 16, 14].map((w, i) => (
                <Skeleton
                  key={i}
                  className="h-8 shrink-0 rounded-lg @[640px]:h-7"
                  style={{ width: w * 4 }}
                />
              ))}
            </div>
          </div>

          <div className="hidden @[640px]:block">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="border-border flex items-center gap-4 border-b px-4 py-3 last:border-b-0"
              >
                <Skeleton className={markClass} />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3 w-2/5" />
                  <Skeleton className="h-2.5 w-1/4" />
                </div>
                <Skeleton className="hidden h-3 w-20 @[720px]:block" />
                <Skeleton className="hidden h-3 w-20 @[860px]:block" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>

          <div className="border-border bg-card overflow-hidden rounded-xl border @[640px]:hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-x-2.5 py-3 pr-3 pl-3"
              >
                <Skeleton className={markClass} />
                <div className="min-w-0 space-y-2">
                  <Skeleton className="h-3 w-3/5" />
                  <Skeleton className="h-2.5 w-2/5" />
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="h-4 w-12 rounded-full" />
                </div>
              </div>
            ))}
          </div>

          <div className="@[640px]:border-border flex items-center justify-between gap-3 @[640px]:border-t @[640px]:px-4 @[640px]:py-3">
            <Skeleton className="h-3 w-32" />
            <div className="flex gap-1">
              <Skeleton className="size-8 rounded-lg" />
              <Skeleton className="size-8 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RailCards({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn(CARD, "space-y-3 p-4.5")}>
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-3/5" />
          {i === count - 1 && (
            <Skeleton className="mt-1 h-9 w-full rounded-lg" />
          )}
        </div>
      ))}
    </>
  );
}

/** Invoice and proposal detail: the document, with a side rail that drops below it on narrow screens. */
export function DocumentDetailSkeleton({
  columns = "@[900px]:grid-cols-[minmax(0,1fr)_320px]",
  railCards = 3,
}: {
  /** The page's own grid columns, so the rail sits at the same width. */
  columns?: string;
  railCards?: number;
}) {
  return (
    <div role="status" aria-label="Loading" className="@container">
      <div className={cn("grid items-start gap-6", columns)}>
        <div className={cn(CARD, "p-5 @[560px]:p-8")}>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-7 w-40" />
            </div>
            <Skeleton className="h-10 w-28" />
          </div>
          <div className="border-border mt-6 grid gap-6 border-y py-6 @[560px]:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-2.5 w-14" />
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
          <div className="mt-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-6">
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-3.5 w-20" />
              </div>
            ))}
          </div>
          <div className="border-border mt-8 flex justify-end border-t pt-6">
            <div className="w-56 space-y-3">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-7 w-full" />
            </div>
          </div>
        </div>
        <aside className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(248px,1fr))] content-start gap-4 @[900px]:grid-cols-1">
          <RailCards count={railCards} />
        </aside>
      </div>
    </div>
  );
}

/** Client and project detail: summary card, tabs, then the tab's list. */
export function RecordDetailSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-6">
      <div className={cn(CARD, "overflow-hidden")}>
        <div className="flex items-center gap-4 px-6 py-5">
          <Skeleton className="size-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="border-border grid grid-cols-2 gap-6 border-t px-6 py-5 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="border-border space-y-2 border-t px-6 py-5">
            <Skeleton className="h-2.5 w-28" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
        <div className="border-border border-t px-6 py-4">
          <Skeleton className="h-3 w-64 max-w-full" />
        </div>
      </div>
      <div className={cn(CARD, "divide-border divide-y overflow-hidden")}>
        <div className="flex gap-2 px-3">
          {[20, 24, 20].map((w, i) => (
            <div key={i} className="px-3 py-3.5">
              <Skeleton className="h-3.5" style={{ width: w * 4 }} />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex gap-1.5">
            {[12, 20, 20].map((w, i) => (
              <Skeleton
                key={i}
                className="h-7 rounded-lg"
                style={{ width: w * 4 }}
              />
            ))}
          </div>
          <Skeleton className="hidden h-8 w-56 rounded-lg sm:block" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-2/5" />
              <Skeleton className="h-2.5 w-1/4" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function FieldBones({ count }: { count: number }) {
  return (
    <div className="grid gap-5 @[560px]:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

function FormCard({ sections }: { sections: number[] }) {
  return (
    <div className={cn(CARD, "divide-border divide-y overflow-hidden")}>
      {sections.map((fields, i) => (
        <section key={i} className="p-6 sm:p-8">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="mt-2 mb-7 h-3 w-64 max-w-full" />
          <FieldBones count={fields} />
        </section>
      ))}
    </div>
  );
}

/** New/edit pages. With `aside`, the builder's summary panel sits beside the form (below it on narrow screens). */
export function FormSkeleton({
  aside = false,
  asideWidth = 360,
}: {
  aside?: boolean;
  asideWidth?: number;
}) {
  if (!aside) {
    return (
      <div
        role="status"
        aria-label="Loading"
        className="@container mx-auto max-w-4xl pb-12"
      >
        <FormCard sections={[4, 2]} />
      </div>
    );
  }
  return (
    <div role="status" aria-label="Loading" className="@container pb-12">
      <div
        className="grid items-start gap-8 @[900px]:grid-cols-[minmax(0,1fr)_var(--aside)]"
        style={{ "--aside": `${asideWidth}px` } as CSSProperties}
      >
        <FormCard sections={[2, 4]} />
        <aside className={cn(CARD, "space-y-4 p-5")}>
          <Skeleton className="h-4 w-28" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-between gap-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
          <Skeleton className="h-10 w-full rounded-lg" />
        </aside>
      </div>
    </div>
  );
}

/** Content of a settings tab: groups of a heading and a card of rows. */
export function SettingsSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-5">
      {[3, 2].map((rows, i) => (
        <section
          key={i}
          className="border-border mx-auto flex w-full max-w-3xl flex-col gap-3 border-t px-2 pt-5 first:border-t-0 first:pt-0 sm:px-6"
        >
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-56 max-w-full" />
          <div className={cn(CARD, "divide-border divide-y")}>
            {Array.from({ length: rows }).map((_, j) => (
              <div
                key={j}
                className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-9 w-full rounded-lg sm:w-64" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** Wraps a page's real (or skeleton) header and its skeleton body in the usual container. */
export function PageSkeleton({
  header,
  children,
}: {
  header: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      {header}
      <DashboardContainer>{children}</DashboardContainer>
    </>
  );
}
