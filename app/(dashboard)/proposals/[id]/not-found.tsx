import Link from "next/link";
import { FileSignature } from "lucide-react";
import PageHeader from "@/components/dashboard/page-header";
import DashboardContainer from "@/components/dashboard/container";
import { CustomButton } from "@/components/ui/custom-button";

// Rendered when getProposalById() returns null — the proposal doesn't exist,
// was deleted, or belongs to someone else. Same shell as the real page so a
// dead link doesn't look like it left the app.
export default function ProposalNotFound() {
  return (
    <>
      <PageHeader
        title="Proposal not found"
        backHref="/proposals"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Proposals", href: "/proposals" },
          { label: "Not found" },
        ]}
      />
      <DashboardContainer>
        <div className="border-border flex flex-col items-center justify-center gap-3 rounded-xl border px-6 py-16 text-center">
          <FileSignature className="text-muted-foreground h-8 w-8" />
          <p className="text-sm font-medium">
            This proposal doesn&apos;t exist, or you don&apos;t have access to
            it.
          </p>
          <p className="text-muted-foreground text-xs">
            It may have been deleted, or the link may be wrong.
          </p>
          <Link href="/proposals">
            <CustomButton variant="secondary" className="mt-2">
              Back to proposals
            </CustomButton>
          </Link>
        </div>
      </DashboardContainer>
    </>
  );
}
