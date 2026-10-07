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

type NewMenuItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const items: NewMenuItem[] = [
  { label: "New Client", href: "/clients/new", icon: UserPlus },
  { label: "New Proposal", href: "/proposals/new", icon: FileText },
  { label: "New Invoice", href: "/invoices/new", icon: Receipt },
];

type NewMenuProps = {
  variant?: "button" | "icon";
  className?: string;
};

export function NewMenu({ variant = "button", className }: NewMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        {variant === "icon" ? (
          <TopBarButton aria-label="Create new" className={className}>
            <TurningPlus open={open} className="size-5" />
          </TopBarButton>
        ) : (
          <CustomButton size="sm" className={cn("gap-1.5", className)}>
            <TurningPlus open={open} className="size-4" />
            New
          </CustomButton>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={6} className="w-52 p-1.5">
        {items.map(({ label, href, icon: Icon }) => (
          <DropdownMenuItem
            key={href}
            asChild
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
