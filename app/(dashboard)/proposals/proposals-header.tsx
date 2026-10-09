import Link from "next/link";
import { FileSignature, Plus } from "lucide-react";
import { CustomButton } from "@/components/ui/custom-button";
import PageHeader from "@/components/dashboard/page-header";

/** Shared by the page and its loading screen, so the header never jumps. */
export function ProposalsHeader({ total }: { total?: number }) {
  return (
    <PageHeader
      title="Proposals"
      subtitle="Send quotes and track what clients accept or decline"
      icon={<FileSignature className="h-5 w-5" />}
      badge={
        total !== undefined && (
          <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px] font-medium">
            {total}
          </span>
        )
      }
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Proposals" },
      ]}
      mobileActions="inline"
      actions={
        <Link href={"/proposals/new"}>
          <CustomButton className="mx-auto flex items-center gap-1 text-xs">
            <Plus className="h-4 w-4" />
            <span>New Proposal</span>
          </CustomButton>
        </Link>
      }
    />
  );
}
