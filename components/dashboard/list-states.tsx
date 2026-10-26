import Link from "next/link";
import { customButtonClasses } from "@/components/ui/custom-button";

/** First-run state: nothing exists yet, with the one action that fixes it. */
export function ListEmpty({
  title,
  body,
  href,
  label,
}: {
  title: string;
  body: string;
  href: string;
  label: string;
}) {
  return (
    <div className="bg-card rounded-lg border shadow-xs">
      <div className="flex max-w-130 flex-col items-start gap-2.5 px-6 py-11">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-muted-foreground text-sm text-pretty">{body}</p>
        <Link
          href={href}
          className={customButtonClasses(
            "primary",
            "sm",
            "mt-1.5 max-sm:h-11 max-sm:w-full",
          )}
        >
          {label}
        </Link>
      </div>
    </div>
  );
}

/**
 * Search or a filter left nothing to show. An empty filter tab is a normal
 * state, not an error, so only a failed search offers a way back.
 */
export function ListNoResults({
  noun,
  search,
  clearHref,
  emptyView,
}: {
  /** Plural, e.g. "invoices". */
  noun: string;
  search?: string;
  clearHref: string;
  /** What an empty filter means, e.g. "No one owes you right now." */
  emptyView?: string;
}) {
  return (
    <div className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-lg border px-5 py-6 shadow-xs">
      <span className="text-muted-foreground text-sm">
        {search
          ? `No ${noun} match "${search}".`
          : (emptyView ?? `No ${noun} here right now.`)}
      </span>
      {search && (
        <Link
          href={clearHref}
          className={customButtonClasses("secondary", "sm")}
        >
          Clear search
        </Link>
      )}
    </div>
  );
}
