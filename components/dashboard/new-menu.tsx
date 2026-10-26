"use client";

import Link from "next/link";
import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import {
  FileText,
  Plus,
  Receipt,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

import { TopBarButton } from "@/components/sidebar/top-bar-button";
import { CustomButton } from "@/components/ui/custom-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type NewMenuItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const ALL_ITEMS: NewMenuItem[] = [
  { label: "New Client", href: "/clients/new", icon: UserPlus },
  { label: "New Proposal", href: "/proposals/new", icon: FileText },
  { label: "New Invoice", href: "/invoices/new", icon: Receipt },
];

type NewMenuProps = {
  /** "row": a nav-style row with a round + icon, for the mobile drawer. */
  variant?: "button" | "icon" | "row";
  className?: string;
  /** What can be created here; everything by default. */
  items?: NewMenuItem[];
  /** Runs when an item is picked, e.g. to close the drawer. */
  onNavigate?: () => void;
};

export function NewMenu({
  variant = "button",
  className,
  items = ALL_ITEMS,
  onNavigate,
}: NewMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        {variant === "icon" ? (
          <TopBarButton aria-label="Create new" className={className}>
            <TurningPlus open={open} className="size-5" />
          </TopBarButton>
        ) : variant === "row" ? (
          <button
            type="button"
            className={cn(
              "hover:bg-sidebar-accent/50 data-[state=open]:bg-sidebar-accent/50 focus-visible:ring-ring flex w-full cursor-pointer items-center gap-1.75 rounded-lg px-3 py-2 font-sans text-sm font-medium focus-visible:ring-2 focus-visible:outline-none",
              className,
            )}
          >
            {/* Centred on the 18px link icons below it. */}
            <span className="bg-primary text-primary-foreground -ml-1.25 flex size-7 items-center justify-center rounded-full">
              <TurningPlus open={open} className="size-4" />
            </span>
            New
          </button>
        ) : (
          <CustomButton size="sm" className={cn("gap-1.5", className)}>
            <TurningPlus open={open} className="size-4" />
            New
          </CustomButton>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={variant === "row" ? "start" : "end"}
        sideOffset={6}
        className="w-52 p-1.5"
      >
        {items.map(({ label, href, icon: Icon }) => (
          <DropdownMenuItem
            key={href}
            asChild
            onSelect={onNavigate}
            className="focus:bg-sidebar-accent/50 cursor-pointer gap-1.5 px-2 py-1.5"
          >
            <Link href={href}>
              <Icon className="size-3.5" />
              {label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TurningPlus({
  open,
  className,
}: {
  open: boolean;
  className: string;
}) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.span
        aria-hidden="true"
        className="flex"
        initial={false}
        animate={{ rotate: open ? 45 : 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <Plus className={className} />
      </motion.span>
    </MotionConfig>
  );
}
