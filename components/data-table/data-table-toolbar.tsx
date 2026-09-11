"use client";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import { SearchIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type FilterOption = {
  label: string;
  value: string;
  /** Tailwind class for the status dot, e.g. "bg-blue-500" */
  dotColor?: string;
};

type FilterConfig = {
  key: string;
  label: string;
  options: FilterOption[];
};

type DataTableToolbarProps = {
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  className?: string;
};

export function DataTableToolbar({
  searchPlaceholder = "Search...",
  filters = [],
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
      router.replace(`${pathname}?${params.toString()}`);
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
    // @container: the flex-row switch, search width, and pill-grid columns
    // below all react to the space this toolbar actually has, not the
    // browser viewport — same reasoning as DataTable/StatsCards. With the
    // sidebar taking real width, a viewport-only `sm:`/`md:` can claim
    // there's room when there isn't.
    <div className="@container">
      <div
        className={cn(
          "flex flex-col gap-3 @[640px]:flex-row @[640px]:items-center @[640px]:gap-3",
          className,
        )}
      >
        {/* Search */}
        <div className="relative w-full @[640px]:w-64">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder={searchPlaceholder}
            className="border-border/60 bg-muted/50 placeholder:text-muted-foreground focus:border-border focus:bg-background focus-visible:ring-ring h-9 w-full rounded-lg border pr-3 pl-9 text-sm transition-colors outline-none focus-visible:ring-1"
          />
        </div>

        {/* Status pills - your grid style */}
        {filters.map((filter) => {
          const currentValue = searchParams.get(filter.key) ?? "";

          return (
            <div
              key={filter.key}
              className="grid grid-cols-3 items-center gap-1.5 @[640px]:grid-cols-5"
            >
              {/* All */}
              <button
                type="button"
                onClick={() => updateParams({ [filter.key]: null })}
                className={cn(
                  "h-8 rounded-lg border px-3 text-xs font-medium transition-colors @[640px]:text-sm",
                  !currentValue
                    ? "border-transparent bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                All
              </button>

              {filter.options.map((option) => {
                const isActive = currentValue === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      updateParams({
                        [filter.key]: isActive ? null : option.value,
                      })
                    }
                    className={cn(
                      "flex h-8 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors @[640px]:text-sm",
                      isActive
                        ? "border-transparent bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                        : "border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {option.dotColor && (
                      <span
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          option.dotColor,
                        )}
                      />
                    )}
                    <span className="truncate">{option.label}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
