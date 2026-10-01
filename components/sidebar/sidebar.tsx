"use client";

import {
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
import { DashboardLogoLink } from "./dashboard-logo-link";
import { DEFAULT_SETTINGS_HREF } from "@/app/(dashboard)/settings/sections";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

type SidebarProps = {
  /** Desktop-only account section; on mobile the topbar avatar covers it. */
  footer?: ReactNode;
};

export const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  // Work order: win a client, propose, run the project, then bill it.
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Proposals", href: "/proposals", icon: FileText },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Invoices", href: "/invoices", icon: Receipt },
];

export const EXTRA_ITEMS = [
  {
    label: "Settings",
    href: DEFAULT_SETTINGS_HREF,
    icon: Settings,
    activePrefix: "/settings",
  },
];

export default function Sidebar({ footer }: SidebarProps) {
  const { isCollapsed, toggleCollapsed, closeMobile, isMobileOpen } =
    useSidebar();

  return (
    <>
      {/* ================= Desktop Sidebar ================= */}
      <aside
        className={cn(
          "bg-sidebar hidden h-screen transition-all duration-200 md:flex md:flex-col",
          isCollapsed ? "w-16" : "w-64",
        )}
      >
        <div
          className={cn(
            "flex h-14 w-full items-center border-b",
            isCollapsed ? "justify-center px-2" : "justify-between px-2",
          )}
        >
          {!isCollapsed && <DashboardLogoLink className="ml-3" />}

          <Tooltip>
            <TooltipTrigger asChild>
              <CustomButton
                variant="ghost"
                className="hover:bg-sidebar-accent/80 hover:text-foreground flex items-center"
                onClick={toggleCollapsed}
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isCollapsed ? (
                  <PanelLeftOpen className="size-5" />
                ) : (
                  <PanelLeftClose className="size-5" />
                )}
              </CustomButton>
            </TooltipTrigger>
            <TooltipContent side="right">
              {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Main links scroll on short screens; Settings and the account
            footer stay pinned to the bottom. */}
        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-5">
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
        </nav>

        <div className="flex shrink-0 flex-col gap-0.5 px-3 pb-2">
          {EXTRA_ITEMS.map((item) => (
            <SidebarNavLink
              key={item.href}
              item={item}
              isCollapsed={isCollapsed}
            />
          ))}
        </div>
        {footer}
      </aside>

      {/* ================= Mobile Sidebar ================= */}
      {/* Kept mounted (not display:none) so the slide and fade can animate;
          `inert` keeps the closed drawer out of focus and click order. */}
      <div
        className={cn(
          "fixed inset-0 z-50 md:hidden",
          !isMobileOpen && "pointer-events-none",
        )}
        inert={!isMobileOpen}
      >
        <div
          onClick={closeMobile}
          className={cn(
            "absolute inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity duration-300",
            isMobileOpen ? "opacity-100" : "opacity-0",
          )}
        />

        <aside
          className={cn(
            "bg-background absolute inset-y-0 left-0 flex w-[min(18.75rem,85vw)] flex-col rounded-r-md border-r shadow-xl transition-transform duration-300 ease-out",
            isMobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
            <DashboardLogoLink onClick={closeMobile} />
            <CustomButton
              variant="ghost"
              size="md"
              onClick={closeMobile}
              aria-label="Close menu"
            >
              <X className="size-5" />
            </CustomButton>
          </div>

          {/* Main links scroll on short screens; Settings stays pinned to the
              bottom. The account menu lives on the topbar avatar instead. */}
          <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-5">
            <h2 className="text-secondary-foreground/80 mb-2 ml-2 font-sans text-xs font-bold tracking-wider uppercase">
              Main
            </h2>
            {NAV_ITEMS.map((item) => (
              <SidebarNavLink
                key={item.href}
                item={item}
                onClick={closeMobile}
              />
            ))}
          </nav>

          <div className="flex shrink-0 flex-col gap-1 px-3 pb-2">
            {EXTRA_ITEMS.map((item) => (
              <SidebarNavLink
                key={item.href}
                item={item}
                onClick={closeMobile}
              />
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}
