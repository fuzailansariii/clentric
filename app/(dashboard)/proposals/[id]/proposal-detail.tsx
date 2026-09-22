import Link from "next/link";
import { FileSignature } from "lucide-react";
import DashboardContainer from "@/components/dashboard/container";
import PageHeader from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatNumber } from "@/lib/format-currency";
import { formatDate } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import { proposalStatusConfig } from "../proposal-status-config";
import type { ProposalDetail } from "../queries";
import { ProposalActions } from "./proposal-actions";

type ProposalDetailViewProps = {
  proposal: ProposalDetail;
};

/** One label/value row in the side panel. */
function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-[13px]">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="min-w-0 text-right font-medium">{value}</dd>
    </div>
  );
}

export function ProposalDetailView({ proposal }: ProposalDetailViewProps) {
  const config = proposalStatusConfig[proposal.status];

  const taxRate = Number(proposal.taxRate);
  const depositPercent = Number(proposal.depositPercent);
  const depositAmount =
    Math.round(Number(proposal.total) * (depositPercent / 100) * 100) / 100;

  // Items carry their milestone id, so grouping happens here rather than in
  // a second query. Anything without a milestone (written before stages
  // existed) falls into a trailing unnamed group instead of vanishing.
  const grouped = proposal.milestones.map((milestone) => ({
    id: milestone.id,
    name: milestone.name,
    description: milestone.description,
    items: proposal.items.filter((item) => item.milestoneId === milestone.id),
  }));

  const ungrouped = proposal.items.filter((item) => !item.milestoneId);
  const sections =
    ungrouped.length > 0
      ? [
          ...grouped,
          {
            id: "ungrouped",
            name: null,
            description: null,
            items: ungrouped,
          },
        ]
      : grouped;

  return (
    <>
      <PageHeader
        title={proposal.title}
        backHref="/proposals"
        icon={<FileSignature className="h-5 w-5" />}
        badge={
          <StatusBadge
            status={config.variant}
            variant="soft"
            className={config.dim ? "opacity-60" : undefined}
          >
            {config.label}
          </StatusBadge>
        }
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Proposals", href: "/proposals" },
          { label: proposal.title },
        ]}
      />

      <DashboardContainer>
        {/* Container queries rather than viewport ones — the sidebar takes
            real width, so the viewport is not what decides whether two
            columns fit here. */}
        <div className="@container pb-12">
          <div className="grid items-start gap-8 @[900px]:grid-cols-[minmax(0,1fr)_320px]">
            {/* The document, as the client would read it. */}
            <article className="bg-card overflow-hidden rounded-xl border shadow-sm">
              <div className="border-border bg-muted/40 border-b px-6 py-6 sm:px-8">
                <p className="text-muted-foreground font-mono text-[10px] font-medium tracking-[0.2em] uppercase">
                  Proposal
                </p>
                <h2 className="font-space mt-2 text-xl leading-snug font-semibold tracking-tight text-balance sm:text-2xl">
                  {proposal.title}
                </h2>
                <p className="text-muted-foreground mt-3 text-sm">
                  Prepared for{" "}
                  <Link
                    href={`/clients/${proposal.client.id}`}
                    className="text-foreground font-medium underline-offset-4 hover:underline"
                  >
                    {proposal.client.company ?? proposal.client.name}
                  </Link>
                </p>
              </div>

              {proposal.content?.trim() && (
                <div className="border-border border-b px-6 py-6 sm:px-8">
                  <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
                    {proposal.content}
                  </p>
                </div>
              )}

              <div className="px-6 py-6 sm:px-8">
                <div className="flex flex-col gap-7">
                  {sections.map((section) => {
                    const stageSubtotal = section.items.reduce(
                      (sum, item) => sum + Number(item.amount),
                      0,
                    );

                    return (
                      <section key={section.id}>
                        {section.name && (
                          <h3 className="font-space text-base font-semibold">
                            {section.name}
                          </h3>
                        )}
                        {section.description && (
                          <p className="text-muted-foreground mt-1 text-sm">
                            {section.description}
                          </p>
                        )}

                        {/* No table here on purpose: at phone width a
                            four-column table either scrolls sideways or
                            crushes the description. Each line is its own row
                            that wraps naturally, amount always right. */}
                        <ul
                          className={cn(
                            "flex flex-col",
                            (section.name || section.description) && "mt-3",
                          )}
                        >
                          {section.items.map((item) => (
                            <li
                              key={item.id}
                              className="border-border flex items-baseline justify-between gap-4 border-b py-3 text-sm last:border-b-0"
                            >
                              <span className="min-w-0">
                                <span className="block">
                                  {item.description}
                                </span>
                                <span className="text-muted-foreground text-xs tabular-nums">
                                  {formatNumber(Number(item.quantity))} ×{" "}
                                  {formatCurrency(item.rate)}
                                </span>
                              </span>
                              <span className="shrink-0 font-medium tabular-nums">
                                {formatCurrency(item.amount)}
                              </span>
                            </li>
                          ))}
                        </ul>

                        {section.items.length > 0 && (
                          <p className="text-muted-foreground mt-2 text-right text-xs tabular-nums">
                            Stage subtotal{" "}
                            {formatCurrency(String(stageSubtotal))}
                          </p>
                        )}
                      </section>
                    );
                  })}
                </div>

                <dl className="mt-5 ml-auto flex max-w-xs flex-col gap-1.5 text-sm">
                  <div className="text-muted-foreground flex justify-between">
                    <dt>Subtotal</dt>
                    <dd className="tabular-nums">
                      {formatCurrency(proposal.subtotal)}
                    </dd>
                  </div>
                  <div className="text-muted-foreground flex justify-between">
                    <dt>
                      Tax{taxRate > 0 ? ` (${formatNumber(taxRate)}%)` : ""}
                    </dt>
                    <dd className="tabular-nums">
                      {formatCurrency(proposal.tax)}
                    </dd>
                  </div>
                  <div className="border-border mt-1.5 flex items-baseline justify-between border-t pt-2.5">
                    <dt className="font-space font-semibold">Total</dt>
                    <dd className="font-space text-lg font-semibold tabular-nums">
                      {formatCurrency(proposal.total)}
                    </dd>
                  </div>
                  {depositPercent > 0 && (
                    <div className="text-muted-foreground mt-2 flex justify-between text-[13px]">
                      <dt>
                        Deposit to begin ({formatNumber(depositPercent)}%)
                      </dt>
                      <dd className="tabular-nums">
                        {formatCurrency(String(depositAmount))}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </article>

            <aside className="flex flex-col gap-4 self-start @[900px]:sticky @[900px]:top-6">
              <div className="bg-card flex flex-col gap-4 rounded-xl border p-5 shadow-sm">
                <ProposalActions
                  proposalId={proposal.id}
                  token={proposal.token}
                  status={proposal.status}
                />

                <dl className="border-border flex flex-col gap-2.5 border-t pt-4">
                  <MetaRow label="Client" value={proposal.client.name} />
                  <MetaRow
                    label="Created"
                    value={formatDate(proposal.createdAt)}
                  />
                  <MetaRow
                    label="Expires"
                    value={
                      proposal.expiresAt
                        ? formatDate(proposal.expiresAt)
                        : "Never"
                    }
                  />
                  {proposal.viewedAt && (
                    <MetaRow
                      label="First viewed"
                      value={formatDate(proposal.viewedAt)}
                    />
                  )}
                  {proposal.acceptedAt && (
                    <MetaRow
                      label="Accepted"
                      value={formatDate(proposal.acceptedAt)}
                    />
                  )}
                  {proposal.rejectedAt && (
                    <MetaRow
                      label="Declined"
                      value={formatDate(proposal.rejectedAt)}
                    />
                  )}
                  {proposal.declineReason && (
                    <div className="border-border mt-1 border-t pt-2.5">
                      <p className="text-muted-foreground text-xs">
                        Reason given
                      </p>
                      <p className="mt-1 text-[13px] whitespace-pre-line">
                        {proposal.declineReason}
                      </p>
                    </div>
                  )}
                  {proposal.revokedAt && (
                    <MetaRow
                      label="Revoked"
                      value={formatDate(proposal.revokedAt)}
                    />
                  )}
                </dl>
              </div>

              {proposal.status === "draft" && (
                <p className="text-muted-foreground px-1 text-xs leading-relaxed">
                  This proposal is a draft. Its link stays closed until you send
                  it.
                </p>
              )}
            </aside>
          </div>
        </div>
      </DashboardContainer>
    </>
  );
}
