import { cookies } from "next/headers";
import { LayoutDashboard } from "lucide-react";

import DashboardContainer from "@/components/dashboard/container";
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

export default async function Dashboard() {
  const user = await requireUser();
  const [
    { profile },
    overview,
    money,
    attention,
    activeProjects,
    openProposals,
    activity,
    cookieStore,
  ] = await Promise.all([
    getDashboardData(user.id),
    getDashboardOverview(),
    getDashboardMoney(),
    getAttentionItems(),
    getActiveProjects(),
    getOpenProposals(),
    getRecentActivity(),
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
      <PageHeader
        title="Dashboard"
        icon={<LayoutDashboard className="h-5 w-5" />}
        className="hidden md:block"
        actions={<NewMenu />}
      />

      <DashboardContainer>
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

        <div className="mt-6">
          <NeedsAttention items={attention} />
        </div>

        <div className="mt-6">
          <StatTiles money={money} />
        </div>

        <div className="mt-6">
          <RevenueCard money={money} />
        </div>

        {/* Side by side once the content area (not the viewport) is wide enough. */}
        <div className="@container mt-6">
          <div className="grid gap-6 @3xl:grid-cols-2">
            <OpenProposals data={openProposals} />
            <ActiveProjects data={activeProjects} />
          </div>
        </div>

        <div className="mt-6">
          <RecentActivity items={activity} />
        </div>
      </DashboardContainer>
    </>
  );
}
