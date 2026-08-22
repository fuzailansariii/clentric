"use client";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import { SearchIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type FilterConfig = {
  key: string;
  label: string;
  options: { label: string; value: string }[];
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

  // Keep a ref to the latest searchParams so effects can read it
  // without needing it in their dependency array (avoids feedback loops).
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

  // Sync local input state when the URL changes from elsewhere
  useEffect(() => {
    setSearchValue(searchParams.get("search") ?? "");
  }, [searchParams]);

  // Push the debounced value to the URL — only reacts to the debounced
  // value changing, not to searchParams (which would cause a loop).
  useEffect(() => {
    const currentSearch = searchParamsRef.current.get("search") ?? "";
    if (debouncedSearch === currentSearch) return;

    updateParams({ search: debouncedSearch || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  return (
    <div className={cn("flex flex-wrap items-center gap-2.5", className)}>
      <div className="relative">
        <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
        <input
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder={searchPlaceholder}
          className="border-border bg-background h-9 w-56 rounded-lg border pr-3 pl-8 text-sm outline-none focus-visible:ring-1"
        />
      </div>

      {filters.map((filter) => (
        <select
          key={filter.key}
          value={searchParams.get(filter.key) ?? ""}
          onChange={(event) =>
            updateParams({ [filter.key]: event.target.value || null })
          }
          className="border-border bg-background h-9 rounded-lg border px-3 text-sm outline-none focus-visible:ring-1"
        >
          <option value="">{filter.label}</option>
          {filter.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ))}
    </div>
  );
}
