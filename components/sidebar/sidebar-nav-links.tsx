"use client";

import type { MouseEvent } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useIsCurrentPage } from "@/hooks/use-is-current-page";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Path the item is active under, when it differs from href. */
  activePrefix?: string;
};

export function SidebarNavLink({
  item,
  isCollapsed = false,
  onClick,
}: {
  item: NavItem;
  isCollapsed?: boolean;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const isCurrentPage = useIsCurrentPage();
  const Icon = item.icon;
  const activePrefix = item.activePrefix ?? item.href;
  const isActive =
    pathname === activePrefix || pathname.startsWith(activePrefix + "/");

  // Skip navigating to the page you're already on; from /clients/123 the
  // link still goes back to the list. The drawer still closes either way.
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isCurrentPage(item.href)) event.preventDefault();
    onClick?.();
  };

  const link = (
    <Link
      href={item.href}
      onClick={handleClick}
      aria-current={isActive ? "page" : undefined}
      // Collapsed links show only an icon, so they need their own name.
      aria-label={isCollapsed ? item.label : undefined}
      className={cn(
        "text-sidebar-foreground relative flex items-center gap-3 rounded-lg px-3 py-2.5 font-sans text-sm",
        isCollapsed && "justify-center px-0",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
      )}
    >
      <Icon size={18} className="shrink-0" />
      {!isCollapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );

  if (!isCollapsed) return link;

  // Collapsed: the label moves into a tooltip beside the icon.
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}
