"use client";

import {
  Bell,
  FileText,
  FolderKanban,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Settings,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-provider";
import { CustomButton } from "../ui/custom-button";
import { SidebarNavLink } from "./sidebar-nav-links";
import { ReactNode } from "react";

type SidebarProps = {
  footer?: ReactNode;
};

export const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Invoices", href: "/invoices", icon: Receipt },
  { label: "Proposals", href: "/proposals", icon: FileText },
];

export const EXTRA_ITEMS = [
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar({ footer }: SidebarProps) {
  const { isCollapsed, toggleCollapsed, closeMobile, isMobileOpen } =
    useSidebar();

  return (
    <>
      {/* ================= Desktop Sidebar ================= */}
      <aside
        className={cn(
          "bg-sidebar hidden border-r transition-all duration-200 md:flex md:flex-col",
          isCollapsed ? "w-16" : "w-64",
        )}
      >
        <div className="flex h-14 w-full items-center justify-between border-b">
          {!isCollapsed && (
            <span className="font-space pl-5 text-lg font-semibold">
              Clentric
            </span>
          )}
          <CustomButton
            variant="ghost"
            className={cn(isCollapsed && "w-full")}
            onClick={toggleCollapsed}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="size-5" />
            ) : (
              <PanelLeftClose className="mr-2 size-5" />
            )}
          </CustomButton>
        </div>

        <nav className="mt-5 flex-1 flex-col gap-0.5 px-3">
          {!isCollapsed && (
            <h2 className="text-secondary-foreground/80 mb-3 ml-2 font-sans text-xs font-bold tracking-wider uppercase">
              Main
            </h2>
          )}

          {NAV_ITEMS.map((item) => (
            <SidebarNavLink
              key={item.href}
              item={item}
              isCollapsed={isCollapsed}
            />
          ))}

          <span className="bg-border mt-5 mb-1 h-px w-full rounded-full" />

          {EXTRA_ITEMS.map((item) => (
            <SidebarNavLink
              key={item.href}
              item={item}
              isCollapsed={isCollapsed}
            />
          ))}
        </nav>
        {footer}
      </aside>

      {/* ================= Mobile Sidebar ================= */}
      <div
        className={cn(
          "fixed inset-0 z-50 md:hidden",
          isMobileOpen ? "block" : "hidden",
        )}
      >
        <div
          onClick={closeMobile}
          className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        />

        <aside
          className={cn(
            "bg-background absolute top-0 left-0 flex h-full w-75 flex-col rounded-r-md border-r shadow-xl transition-transform duration-300 ease-out",
            isMobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-14 items-center justify-between border-b px-4">
            <h1 className="font-space text-lg font-semibold">Clentric</h1>
            <CustomButton variant="ghost" size="md" onClick={closeMobile}>
              <X className="size-5" />
            </CustomButton>
          </div>

          <nav className="mt-5 flex flex-1 flex-col gap-1 px-3">
            {[...NAV_ITEMS, ...EXTRA_ITEMS].map((item) => (
              <SidebarNavLink
                key={item.href}
                item={item}
                onClick={closeMobile}
              />
            ))}
          </nav>

          {footer}
        </aside>
      </div>
    </>
  );
}
