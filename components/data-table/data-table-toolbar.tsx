"use client";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import { SearchIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type FilterOption = {
  label: string;
  value: string;
  /** Rows matching this option, with the search applied. */
  count?: number;
};

type FilterConfig = {
  key: string;
  /** Accessible name for the tab group, e.g. "Filter clients by status". */
  label: string;
  options: FilterOption[];
  /** Count shown on the "All" tab. */
  allCount?: number;
};

type DataTableToolbarProps = {
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  /** Buttons shown next to the search box, e.g. "New Project". */
  actions?: ReactNode;
  className?: string;
};

export function DataTableToolbar({
  searchPlaceholder = "Search...",
  filters = [],
  actions,
  className,
}: DataTableToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const searchParamsRef = useRef(searchParams);
  useEffect(() => {
    searchParamsRef.current = searchParams;
  }, [searchParams]);

  const [searchValue, setSearchValue] = useState(
    searchParams.get("search") ?? "",
  );
  const debouncedSearch = useDebouncedValue(searchValue, 350);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParamsRef.current.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      params.set("page", "1");
      // scroll: false — the toolbar can sit well down a page (client detail
      // tabs); jumping to the top on every keystroke would lose your place.
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router],
  );

  useEffect(() => {
    setSearchValue(searchParams.get("search") ?? "");
  }, [searchParams]);

  useEffect(() => {
    const currentSearch = searchParamsRef.current.get("search") ?? "";
    if (debouncedSearch === currentSearch) return;
    updateParams({ search: debouncedSearch || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  return (
    // @container: layout reacts to the space this toolbar actually has, not
    // the viewport — with the sidebar taking real width, a viewport-only
    // `sm:`/`md:` can claim there's room when there isn't.
    <div className="@container">
      <div
        className={cn(
          "flex flex-col gap-3 @[640px]:flex-row @[640px]:items-center @[640px]:justify-between",
          className,
        )}
      >
        {/* Search (+ optional actions): first and full width on mobile,
            after the tabs from 640px up. */}
        <div className="flex w-full items-center gap-2 @[640px]:order-last @[640px]:w-auto">
          <div className="relative min-w-0 flex-1 @[640px]:w-56 @[640px]:flex-none">
            <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <input
              type="search"
              aria-label={searchPlaceholder}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={searchPlaceholder}
              className="border-border bg-card placeholder:text-muted-foreground focus-visible:ring-ring h-9 w-full rounded-lg border pr-3 pl-9 text-sm outline-none focus-visible:ring-2 @[640px]:bg-secondary/40 @[640px]:h-8"
            />
          </div>
          {actions}
        </div>

        {/* Status tabs with counts. They scroll sideways on mobile instead
            of wrapping into a grid. */}
        {filters.map((filter) => {
          const currentValue = searchParams.get(filter.key) ?? "";

          return (
            <div
              key={filter.key}
              role="group"
              aria-label={filter.label}
              className="flex min-w-0 gap-1.5 overflow-x-auto [scrollbar-width:none] @[640px]:gap-0.5 [&::-webkit-scrollbar]:hidden"
            >
              <FilterTab
                label="All"
                count={filter.allCount}
                active={!currentValue}
                onClick={() => updateParams({ [filter.key]: null })}
              />

              {filter.options.map((option) => {
                const isActive = currentValue === option.value;

                return (
                  <FilterTab
                    key={option.value}
                    label={option.label}
                    count={option.count}
                    active={isActive}
                    onClick={() =>
                      updateParams({
                        [filter.key]: isActive ? null : option.value,
                      })
                    }
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FilterTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "focus-visible:ring-ring inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-[13px] whitespace-nowrap transition-colors outline-none focus-visible:ring-2",
        "@[640px]:h-7 @[640px]:px-2.5",
        // Mobile: solid chips, the active one inverted. From 640px: quiet
        // tabs, the active one on a light fill.
        active
          ? "bg-foreground text-background border-transparent font-medium @[640px]:bg-secondary @[640px]:text-foreground @[640px]:border-border"
          : "border-border bg-card text-muted-foreground hover:text-foreground @[640px]:hover:bg-secondary/60 @[640px]:border-transparent @[640px]:bg-transparent",
      )}
    >
      {label}
      {count !== undefined && (
        <span
          className={cn(
            "text-xs tabular-nums",
            active
              ? "text-background/65 @[640px]:text-muted-foreground"
              : "text-muted-foreground/70",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
