"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table/data-table";
import { proposalColumns } from "./proposals-columns";
import { renderProposalMobileCard } from "./render-proposal-mobile-card";
import type { ProposalListItem } from "./queries";

export function ProposalsTable({
  data,
  toolbar,
  footer,
  className,
}: {
  data: ProposalListItem[];
  toolbar?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const router = useRouter();

  return (
    <DataTable
      data={data}
      columns={proposalColumns}
      renderMobileCard={renderProposalMobileCard}
      getRowId={(row) => row.id}
      getRowAriaLabel={(row) => `View proposal ${row.title}`}
      onRowClick={(row) => router.push(`/proposals/${row.id}`)}
      emptyMessage="No proposals yet."
      toolbar={toolbar}
      footer={footer}
      className={className}
    />
  );
}
