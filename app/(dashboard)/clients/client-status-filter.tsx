"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { clientStatusConfig, type ClientStatus } from "./client-status-config";

/** "All statuses / Lead / Active / ..." kept in the URL like the chips. */
export function ClientStatusFilter({ value }: { value: ClientStatus | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const onChange = (next: string) => {
    const params = new URLSearchParams(searchParams);
    if (next === "all") params.delete("status");
    else params.set("status", next);
    params.delete("page");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  return (
    <Select value={value ?? "all"} onValueChange={onChange}>
      <SelectTrigger
        aria-label="Client status"
        className="bg-card h-9 w-36 shrink-0"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All statuses</SelectItem>
        {(Object.keys(clientStatusConfig) as ClientStatus[]).map((status) => (
          <SelectItem key={status} value={status}>
            {clientStatusConfig[status].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
