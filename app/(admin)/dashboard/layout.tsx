import AdminMobileTopbar from "@/components/admin-mobile-topbar";
import AdminSidebar from "@/components/admin-sidebar";
import React, { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[56px_1fr] lg:grid-cols-[260px_1fr] min-h-screen">
      <AdminSidebar />
      <AdminMobileTopbar />
      <main className="overflow-auto">{children}</main>
    </div>
  );
}
