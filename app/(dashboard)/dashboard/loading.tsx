import { LayoutDashboard } from "lucide-react";

import DashboardContainer from "@/components/dashboard/container";
import {
  ActivitySkeleton,
  AttentionSkeleton,
  RevenueSkeleton,
  StatTilesSkeleton,
  TablesSkeleton,
  WelcomeSkeleton,
} from "@/components/dashboard/dashboard-skeletons";
import PageHeader from "@/components/dashboard/page-header";

// Shown until the page shell arrives; each section then streams in on its own.
export default function DashboardLoading() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        icon={<LayoutDashboard className="h-5 w-5" />}
        className="hidden md:block"
      />

      <DashboardContainer>
        <div role="status" aria-label="Loading your dashboard">
          <WelcomeSkeleton />
          <div className="mt-6">
            <AttentionSkeleton />
          </div>
          <div className="mt-6">
            <StatTilesSkeleton />
          </div>
          <div className="mt-6">
            <RevenueSkeleton />
          </div>
          <div className="mt-6">
            <TablesSkeleton />
          </div>
          <div className="mt-6">
            <ActivitySkeleton />
          </div>
        </div>
      </DashboardContainer>
    </>
  );
}
