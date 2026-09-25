import { notFound } from "next/navigation";
import { SettingsSection } from "@/components/settings/settings-section";
import { StatusBadge } from "@/components/ui/status-badge";
import { getPlanUsage } from "./queries";

// Whole-number counts ("1,204"); formatNumber is for money-style decimals.
const countFormat = new Intl.NumberFormat("en-US");

/**
 * Beta: static and read-only, no billing. users.plan is already read by
 * getPlanUsage so this can grow into the real billing view, but the beta
 * copy shows whatever it says for now.
 */
export async function PlanSection() {
  const usage = await getPlanUsage();

  // requireUser() has already run, so a missing row means the profile was
  // never created rather than that nobody is signed in.
  if (!usage) {
    notFound();
  }

  const tiles = [
    { label: "Clients", value: usage.clients },
    { label: "Proposals", value: usage.proposals },
    { label: "Projects", value: usage.projects },
    { label: "Invoices this month", value: usage.invoicesThisMonth },
  ];

  return (
    <SettingsSection
      title="Your plan"
      badge={<StatusBadge status="success">Free during beta</StatusBadge>}
      description="Everything is unlocked while Clentric is in beta. Founding members get a discount when paid plans launch."
    >
      <div className="@container flex flex-col gap-4">
        <dl className="grid grid-cols-2 gap-3 @[560px]:grid-cols-4">
          {tiles.map((tile) => (
            <div
              key={tile.label}
              className="bg-secondary/40 flex min-w-0 flex-col-reverse gap-1 rounded-lg border px-4 py-3.5"
            >
              <dt className="text-muted-foreground truncate text-sm">
                {tile.label}
              </dt>
              <dd className="font-space text-2xl font-medium tabular-nums @[560px]:text-3xl">
                {countFormat.format(tile.value)}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-muted-foreground text-xs">
          No limits apply during the beta. We’ll email you before anything
          changes.
        </p>
      </div>
    </SettingsSection>
  );
}
