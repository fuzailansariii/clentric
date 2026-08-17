import { formatPhone } from "@/lib/format-phone";
import { StatusBadge } from "../ui/status-badge";
import { AvatarInitials } from "../ui/avatar-initials";
import { clientStatusConfig } from "@/app/(dashboard)/clients/client-status-config";
import type { ClientRow } from "@/src/db/schema/clients";

export function renderClientMobileCard(row: ClientRow) {
  const config = clientStatusConfig[row.status];

  return (
    <div className="flex flex-col gap-2 px-4.5 py-3.5">
      {/* Top */}
      <div className="flex items-center gap-2.5">
        <AvatarInitials name={row.name} variant="colored" shape="circle" />

        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-medium">{row.name}</div>

          {row.email && (
            <div className="text-muted-foreground truncate text-[11.5px]">
              {row.email}
            </div>
          )}
        </div>
      </div>

      {/* Bottom */}
      <div className="pl-10. flex items-center justify-between">
        {row.phone ? (
          <span className="text-muted-foreground font-mono text-xs">
            {formatPhone(row.phone)}
          </span>
        ) : (
          <span className="text-muted-foreground font-mono text-xs">—</span>
        )}

        <StatusBadge
          status={config.variant}
          className={config.dim ? "opacity-60" : undefined}
        >
          {config.label}
        </StatusBadge>
      </div>
    </div>
  );
}
