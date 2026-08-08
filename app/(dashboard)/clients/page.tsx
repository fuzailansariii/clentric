import DashboardContainer from "@/components/dashboard/container";
import PageHeader from "@/components/dashboard/page-header";
import { CustomButton } from "@/components/ui/custom-button";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import React from "react";

export default function ClientsPage() {
  return (
    <DashboardContainer>
      <PageHeader
        title="Clients"
        description="Manage your clients"
        actions={
          <CustomButton variant="primary">
            <Link href={"/clients/new"} className="flex items-center gap-2">
              <PlusIcon className="h-4 w-4" />
              Add Client
            </Link>
          </CustomButton>
        }
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Clients" },
        ]}
      />
    </DashboardContainer>
  );
}
