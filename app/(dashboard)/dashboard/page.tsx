import { Suspense } from "react";
import { cookies } from "next/headers";
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
import { NewMenu } from "@/components/dashboard/new-menu";
import {
  OnboardingSteps,
  type OnboardingProgress,
} from "@/components/dashboard/onboarding-steps";
import PageHeader from "@/components/dashboard/page-header";
import { ActiveProjects } from "@/components/dashboard/active-projects";
import { NeedsAttention } from "@/components/dashboard/needs-attention";
import { OpenProposals } from "@/components/dashboard/open-proposals";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { RevenueCard } from "@/components/dashboard/revenue-card";
import { StatTiles } from "@/components/dashboard/stat-tiles";
import WelcomeHeader from "@/components/dashboard/welcome-header";
import { requireUser } from "@/lib/current-user";
import { formatCurrencyWhole } from "@/lib/format-currency";
import { SETUP_HIDDEN_COOKIE } from "@/lib/setup-hidden-cookie";
import { getDashboardData } from "../queries";
import {
  getActiveProjects,
  getDashboardOverview,
  getOpenProposals,
  getRecentActivity,
} from "./queries";
import { getAttentionItems } from "./attention-queries";
import { getDashboardMoney, type DashboardMoney } from "./money-queries";

function getStatus(money: DashboardMoney | null) {
  if (money === null) return "Here's where things stand.";

  const fmt = (value: string) => formatCurrencyWhole(value, money.currency);
  const owed =
    Number(money.outstanding) > 0
      ? ` ${fmt(money.outstanding)} is outstanding.`
      : "";

  if (money.overdueCount > 0) {
    const invoiceWord =
      money.overdueCount === 1 ? "invoice is" : "invoices are";
    return `${money.overdueCount} ${invoiceWord} overdue (${fmt(money.overdue)}).${owed}`;
  }

  return `Nothing needs you right now.${owed}`;
}

// Each section loads its own data and streams in as soon as it's ready.
export default function Dashboard() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        icon={<LayoutDashboard className="h-5 w-5" />}
        className="hidden md:block"
        actions={<NewMenu />}
      />

      <DashboardContainer>
        <Suspense fallback={<WelcomeSkeleton />}>
          <WelcomeSection />
        </Suspense>

        <div className="mt-6">
          <Suspense fallback={<AttentionSkeleton />}>
            <AttentionSection />
          </Suspense>
        </div>

        <div className="mt-6">
          <Suspense fallback={<StatTilesSkeleton />}>
            <StatsSection />
          </Suspense>
        </div>

        <div className="mt-6">
          <Suspense fallback={<RevenueSkeleton />}>
            <RevenueSection />
          </Suspense>
        </div>

        <div className="mt-6">
          <Suspense fallback={<TablesSkeleton />}>
            <TablesSection />
          </Suspense>
        </div>

        <div className="mt-6">
          <Suspense fallback={<ActivitySkeleton />}>
            <ActivitySection />
          </Suspense>
        </div>
      </DashboardContainer>
    </>
  );
}

async function WelcomeSection() {
  const user = await requireUser();
  const [{ profile }, overview, money, cookieStore] = await Promise.all([
    getDashboardData(user.id),
    getDashboardOverview(),
    getDashboardMoney(),
    cookies(),
  ]);

  const name = profile?.name?.trim().split(/\s+/)[0] || user.email || "there";
  const progress: OnboardingProgress = {
    hasClient: overview.clientCount > 0,
    hasInvoice: overview.invoiceCount > 0,
    hasProposal: overview.proposalCount > 0,
  };
  const allStepsDone =
    progress.hasClient && progress.hasInvoice && progress.hasProposal;
  // Hidden only for the account that hid it (the cookie holds its id).
  const setupHidden = cookieStore.get(SETUP_HIDDEN_COOKIE)?.value === user.id;
  // Welcome copy only while setup is open; hidden setup folds to its header.
  const isNewUser = !allStepsDone && !setupHidden;

  return (
    <>
      <WelcomeHeader
        name={name}
        isNewUser={isNewUser}
        status={
          isNewUser ? "Three steps to your first payment" : getStatus(money)
        }
      />

      {!allStepsDone && (
        <div className="mt-6">
          <OnboardingSteps
            progress={progress}
            userId={user.id}
            initiallyHidden={setupHidden}
          />
        </div>
      )}
    </>
  );
}

async function AttentionSection() {
  return <NeedsAttention items={await getAttentionItems()} />;
}

async function StatsSection() {
  return <StatTiles money={await getDashboardMoney()} />;
}

async function RevenueSection() {
  return <RevenueCard money={await getDashboardMoney()} />;
}

async function TablesSection() {
  const [openProposals, activeProjects] = await Promise.all([
    getOpenProposals(),
    getActiveProjects(),
  ]);

  // Side by side once the content area (not the viewport) is wide enough.
  return (
    <div className="@container">
      <div className="grid gap-6 @3xl:grid-cols-2">
        <OpenProposals data={openProposals} />
        <ActiveProjects data={activeProjects} />
      </div>
    </div>
  );
}

async function ActivitySection() {
  return <RecentActivity items={await getRecentActivity()} />;
}
