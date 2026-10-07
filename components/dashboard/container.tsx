import { cn } from "@/lib/utils";
import React from "react";

export default function DashboardContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={cn("w-full min-w-0 max-w-full px-2 py-5 sm:px-3 md:px-5 lg:px-10")}>
      {children}
    </div>
  );
}
