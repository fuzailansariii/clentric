import Link from "next/link";
import { CircleAlert, History } from "lucide-react";
import type { ActivityItem } from "@/app/(dashboard)/dashboard/queries";
import { ActivityTime } from "@/components/dashboard/activity-time";
import {
  DashboardCard,
  DashboardCardEmpty,
} from "@/components/dashboard/dashboard-card";
import { statusToneStyles } from "@/components/ui/status-badge";
import { describeActivity } from "@/lib/activity-display";
import { formatShortAgo } from "@/lib/format-date";
import { cn } from "@/lib/utils";

/** `null` means the feed failed to load. */
export function RecentActivity({ items }: { items: ActivityItem[] | null }) {
  return (
    <DashboardCard id="recent-activity-title" title="Recent activity">
      {items === null ? (
        <DashboardCardEmpty
          icon={CircleAlert}
          title="Couldn't load activity"
          text="Refresh the page to try again."
        />
      ) : items.length === 0 ? (
        <DashboardCardEmpty
          icon={History}
          title="No activity yet"
          text="Sent invoices, viewed proposals and client payments will show up here."
        />
      ) : (
        <ol className="py-2">
          {items.map((item, index) => (
            <ActivityRow
              key={item.id}
              item={item}
              isLast={index === items.length - 1}
            />
          ))}
        </ol>
      )}
    </DashboardCard>
  );
}

function ActivityRow({
  item,
  isLast,
}: {
  item: ActivityItem;
  isLast: boolean;
}) {
  const { icon: Icon, tone, actor, rest, href } = describeActivity(item);

  return (
    <li className="relative">
      <Link
        href={href}
        className="hover:bg-muted/40 focus-visible:ring-ring flex items-start gap-3 px-4 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
      >
        <span
          aria-hidden="true"
          className={cn(
            "relative z-10 inline-flex size-7 shrink-0 items-center justify-center rounded-full [&_svg]:size-3.5",
            statusToneStyles[tone],
          )}
        >
          <Icon />
        </span>
        {/* Narrow: time under the sentence. Wide: time on the right. */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1 @md:flex-row @md:items-center @md:gap-3">
          <p className="text-muted-foreground min-w-0 flex-1 text-sm leading-snug">
            <span className="text-foreground font-semibold">{actor}</span>{" "}
            {rest}
          </p>
          <ActivityTime
            date={item.createdAt.toISOString()}
            initialText={formatShortAgo(item.createdAt)}
          />
        </div>
      </Link>
      {/* Timeline line from this icon down to the next one. */}
      {!isLast && (
        <span
          aria-hidden="true"
          className="bg-border pointer-events-none absolute top-9 -bottom-2 left-7.5 w-px"
        />
      )}
    </li>
  );
}
