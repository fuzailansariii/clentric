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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-provider";
import { MobileDrawer } from "../mobile-drawer";
import { SidebarNavLink, type NavBadge } from "./sidebar-nav-links";
import { ReactNode } from "react";
import { DashboardLogoLink } from "./dashboard-logo-link";
import { DEFAULT_SETTINGS_HREF } from "@/app/(dashboard)/settings/sections";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

type SidebarProps = {
  /** Desktop-only account section; on mobile the topbar avatar covers it. */
  footer?: ReactNode;
  counts?: { openProposals: number; overdueInvoices: number };
};

const HOME_ITEM = {
  label: "Dashboard",
  href: "/dashboard",
  icon: LayoutDashboard,
};

// Work order: win a client, propose, run the project, then bill it.
const WORKSPACE_ITEMS = [
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Proposals", href: "/proposals", icon: FileText },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Invoices", href: "/invoices", icon: Receipt },
];

const EXTRA_ITEMS = [
  {
    label: "Settings",
    href: DEFAULT_SETTINGS_HREF,
    icon: Settings,
    activePrefix: "/settings",
  },
];

export default function Sidebar({ footer, counts }: SidebarProps) {
  const { isCollapsed, toggleCollapsed, closeMobile, isMobileOpen } =
    useSidebar();

  const badges: Record<string, NavBadge | undefined> = {
    "/proposals": counts && { count: counts.openProposals, tone: "neutral" },
    "/invoices": counts && { count: counts.overdueInvoices, tone: "danger" },
  };

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
            "flex h-14 w-full shrink-0 items-center border-b",
            isCollapsed ? "justify-center px-2" : "px-5",
          )}
        >
          <DashboardLogoLink variant={isCollapsed ? "mark" : "brand"} />
        </div>

        {/* Main links scroll on short screens; Collapse, Settings and the
            account footer stay pinned to the bottom. */}
        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
          <SidebarNavLink item={HOME_ITEM} isCollapsed={isCollapsed} />

          {isCollapsed ? (
            <div aria-hidden="true" className="bg-border mx-2 my-3 h-px" />
          ) : (
            <h2 className="text-muted-foreground mt-4 mb-1.5 ml-3 font-sans text-xs font-medium">
              Workspace
            </h2>
          )}

          {WORKSPACE_ITEMS.map((item) => (
            <SidebarNavLink
              key={item.href}
              item={item}
              isCollapsed={isCollapsed}
              badge={badges[item.href]}
            />
          ))}
        </nav>

        <div className="flex shrink-0 flex-col gap-0.5 px-3 pb-2">
          <CollapseButton isCollapsed={isCollapsed} onClick={toggleCollapsed} />
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
      {/* The account menu lives on the topbar avatar instead. */}
      <MobileDrawer
        open={isMobileOpen}
        onClose={closeMobile}
        header={<DashboardLogoLink variant="brand" onClick={closeMobile} />}
        footer={EXTRA_ITEMS.map((item) => (
          <SidebarNavLink key={item.href} item={item} onClick={closeMobile} />
        ))}
      >
        <SidebarNavLink item={HOME_ITEM} onClick={closeMobile} />
        <h2 className="text-muted-foreground mt-4 mb-1.5 ml-3 font-sans text-xs font-medium">
          Workspace
        </h2>
        {WORKSPACE_ITEMS.map((item) => (
          <SidebarNavLink
            key={item.href}
            item={item}
            onClick={closeMobile}
            badge={badges[item.href]}
          />
        ))}
      </MobileDrawer>
    </>
  );
}

function CollapseButton({
  isCollapsed,
  onClick,
}: {
  isCollapsed: boolean;
  onClick: () => void;
}) {
  const Icon = isCollapsed ? PanelLeftOpen : PanelLeftClose;
  const label = isCollapsed ? "Expand sidebar" : "Collapse sidebar";

  const button = (
    <button
      type="button"
      onClick={onClick}
      aria-label={isCollapsed ? label : undefined}
      className={cn(
        "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground focus-visible:ring-ring flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 font-sans text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none",
        isCollapsed && "justify-center px-0",
      )}
    >
      <Icon size={18} className="shrink-0" />
      {!isCollapsed && <span>Collapse</span>}
    </button>
  );

  if (!isCollapsed) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
