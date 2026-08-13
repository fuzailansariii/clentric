"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CustomButton } from "@/components/ui/custom-button";

type DataTablePaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function DataTablePagination({
  page,
  pageSize,
  total,
  totalPages,
}: DataTablePaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (total === 0) return null;

  const goToPage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    router.push(`${pathname}?${params.toString()}`);
  };

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-muted-foreground text-xs">
        Showing {start}–{end} of {total}
      </p>
      <div className="flex items-center gap-2">
        <CustomButton
          variant="secondary"
          disabled={page <= 1}
          onClick={() => goToPage(page - 1)}
        >
          Previous
        </CustomButton>
        <span className="text-muted-foreground px-1 text-xs">
          Page {page} of {totalPages}
        </span>
        <CustomButton
          variant="secondary"
          disabled={page >= totalPages}
          onClick={() => goToPage(page + 1)}
        >
          Next
        </CustomButton>
      </div>
    </div>
  );
}
