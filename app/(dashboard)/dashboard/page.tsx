import { cookies } from "next/headers";
import { LayoutDashboard } from "lucide-react";

import DashboardContainer from "@/components/dashboard/container";
import { NewMenu } from "@/components/dashboard/new-menu";
import {
  OnboardingSteps,
  type OnboardingProgress,
} from "@/components/dashboard/onboarding-steps";
import PageHeader from "@/components/dashboard/page-header";
import WelcomeHeader from "@/components/dashboard/welcome-header";
import { requireUser } from "@/lib/current-user";
import { formatCurrency } from "@/lib/format-currency";
import { SETUP_HIDDEN_COOKIE } from "@/lib/setup-hidden-cookie";
import { getDashboardData } from "../queries";
import { getDashboardOverview } from "./queries";

type Overview = Awaited<ReturnType<typeof getDashboardOverview>>;

function getStatus(overview: Overview) {
  const owed =
    Number(overview.outstanding) > 0
      ? ` ${formatCurrency(overview.outstanding)} is outstanding.`
      : "";

  if (overview.overdueCount > 0) {
    const invoiceWord =
      overview.overdueCount === 1 ? "invoice is" : "invoices are";
    return `${overview.overdueCount} ${invoiceWord} overdue (${formatCurrency(overview.overdue)}).${owed}`;
  }

  return `Nothing needs you right now.${owed}`;
}

export default async function Dashboard() {
  const user = await requireUser();
  const [{ profile }, overview, cookieStore] = await Promise.all([
    getDashboardData(user.id),
    getDashboardOverview(),
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
            isNewUser
              ? "Three steps to your first payment"
              : getStatus(overview)
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
      </DashboardContainer>
    </>
  );
}
