import { SidebarProvider } from "@/components/sidebar/sidebar-provider";
import { cookies } from "next/headers";
import { ReactNode } from "react";
import Sidebar from "@/components/sidebar/sidebar";
import { MobileTopBar } from "@/components/sidebar/mobile-topbar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SidebarFooter from "@/components/sidebar/sidebar-footer";
import { logoutAction } from "../(auth)/action";
import { getDashboardData } from "./queries";
import { Toaster } from "@/components/ui/sonner";
import { VerticalScale } from "@/components/ui/scale-border";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const collapsed = cookieStore.get("sidebar_collapsed")?.value === "true";

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const { profile, subscription } = await getDashboardData(authUser.id);

  return (
    <SidebarProvider defaultCollapsed={collapsed}>
      <div className="fixed inset-0 flex overflow-hidden">
        <Sidebar
          footer={
            <SidebarFooter
              user={{
                name: profile?.name ?? authUser.email ?? "Account",
                email: authUser.email ?? "",
                avatarUrl: profile?.avatar ?? undefined,
              }}
              plan={subscription?.plan ?? "free"}
              onLogoutClick={logoutAction}
            />
          }
        />

        <VerticalScale className="hidden md:block" />
        <div className="flex flex-1 flex-col overflow-hidden">
          <MobileTopBar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}
