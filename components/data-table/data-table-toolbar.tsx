"use client";

import { cn } from "@/lib/utils";
import { SearchIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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

  const [searchValue, setSearchValue] = useState(
    searchParams.get("search") ?? "",
  );

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const currentSearch = searchParams.get("search") ?? "";
    if (searchValue === currentSearch) return; // skip on mount / no-op change

    const handle = setTimeout(() => {
      updateParams({ search: searchValue || null });
    }, 350);

    return () => clearTimeout(handle);
  }, [searchValue]);

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
          defaultValue={searchParams.get(filter.key) ?? ""}
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
