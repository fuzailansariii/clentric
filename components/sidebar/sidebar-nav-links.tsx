"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { label: string; href: string; icon: LucideIcon };

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
  const Icon = item.icon;
  const isActive =
    pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-lg px-3 py-2.5 font-sans text-sm font-medium",
        isCollapsed && "justify-center px-0",
        isActive
          ? "bg-sidebar-accent text-sidebar-primary"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50",
      )}
    >
      {isActive && (
        <span
          className={cn(
            "bg-primary absolute left-0 rounded-r-full",
            isCollapsed ? "top-1.5 h-6 w-0.5" : "top-2 h-6 w-0.5",
          )}
        />
      )}
      <Icon size={18} className="shrink-0" />
      {!isCollapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}
