"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type DataTablePaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  className?: string;
};

export function DataTablePagination({
  page,
  pageSize,
  total,
  totalPages,
  className,
}: DataTablePaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (total === 0) return null;

  const goToPage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    router.replace(`${pathname}?${params.toString()}`);
  };

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div
      className={cn(
        "border-border bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-1.5",
        className,
      )}
    >
      <p className="text-muted-foreground text-xs">
        Showing{" "}
        <span className="text-foreground font-medium">
          {start}–{end}
        </span>{" "}
        of <span className="text-foreground font-medium">{total}</span>
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => goToPage(page - 1)}
          className={cn(
            "border-border flex h-8 w-8 items-center justify-center rounded-lg border text-sm transition-colors",
            "hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
          )}
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>

        <span className="text-muted-foreground min-w-22 px-2 text-center text-xs font-medium">
          Page {page} of {totalPages}
        </span>

        <button
          type="button"
          aria-label="Next page"
          disabled={page >= totalPages}
          onClick={() => goToPage(page + 1)}
          className={cn(
            "border-border flex h-8 w-8 items-center justify-center rounded-lg border text-sm transition-colors",
            "hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
          )}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
