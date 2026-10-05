import { SidebarProvider } from "@/components/sidebar/sidebar-provider";
import { cookies } from "next/headers";
import { ReactNode } from "react";
import Sidebar from "@/components/sidebar/sidebar";
import { MobileTopBar } from "@/components/sidebar/mobile-topbar";
import { getAuthUser } from "@/lib/current-user";
import { redirect } from "next/navigation";
import SidebarFooter from "@/components/sidebar/sidebar-footer";
import { logoutAction } from "../(auth)/action";
import { getDashboardData, getSidebarCounts } from "./queries";
import { Toaster } from "@/components/ui/sonner";
import { VerticalScale } from "@/components/ui/scale-border";
import { TooltipProvider } from "@/components/ui/tooltip";
import { formatDate } from "@/lib/format-date";
import { scheduledDeletionDate } from "@/lib/account-deletion";
import { RestoreAccountScreen } from "./restore-account-screen";
import { getEffectivePlan } from "@/lib/billing";
import { logError } from "@/lib/errors";
import type { Plan } from "@/components/sidebar/account-menu";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const sidebarCookie = cookieStore.get("sidebar_collapsed")?.value;
  const collapsed =
    sidebarCookie === undefined ? true : sidebarCookie === "true";

  const authUser = await getAuthUser();
  if (!authUser) redirect("/login");

  const [{ profile }, sidebarCounts, billingState] = await Promise.all([
    getDashboardData(authUser.id),
    getSidebarCounts(authUser.id),
    // A billing hiccup shows Free in the menu rather than breaking every page.
    getEffectivePlan(authUser.id).catch((error) => {
      logError("DashboardLayout.plan", error);
      return null;
    }),
  ]);
  const plan: Plan =
    billingState?.source === "beta" ? "beta" : (billingState?.plan ?? "free");

  // Pending deletion: no app, only the choice to restore or leave. The
  // pages below would be refused anyway (requireUser locks the account).
  if (profile?.deletionRequestedAt) {
    return (
      <>
        <RestoreAccountScreen
          deletionDate={formatDate(
            scheduledDeletionDate(profile.deletionRequestedAt),
          )}
        />
        <Toaster />
      </>
    );
  }

  return (
    <SidebarProvider defaultCollapsed={collapsed}>
      <TooltipProvider>
        <div className="fixed inset-0 flex overflow-hidden">
          <Sidebar
            counts={sidebarCounts}
            footer={
              <SidebarFooter
                user={{
                  name: profile?.name ?? authUser.email ?? "Account",
                  email: authUser.email ?? "",
                  avatarUrl: profile?.avatar ?? undefined,
                }}
                plan={plan}
                onLogoutClick={logoutAction}
              />
            }
          />

          <VerticalScale className="hidden md:block" />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <MobileTopBar
              user={{
                name: profile?.name ?? authUser.email ?? "Account",
                email: authUser.email ?? "",
              }}
              plan={plan}
              onLogoutClick={logoutAction}
            />
            <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
      </TooltipProvider>
      <Toaster />
    </SidebarProvider>
  );
}
