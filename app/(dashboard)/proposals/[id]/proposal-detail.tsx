import Link from "next/link";
import { FileSignature } from "lucide-react";
import DashboardContainer from "@/components/dashboard/container";
import PageHeader from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatNumber } from "@/lib/format-currency";
import { formatDate } from "@/lib/format-date";
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

  // Only the tax amount is stored, not the rate it came from, so the
  // percentage is derived for display. Exact for any rate that produced a
  // clean amount; it is a label, never used to recompute money.
  const subtotal = Number(proposal.subtotal);
  const taxRate = subtotal > 0 ? (Number(proposal.tax) / subtotal) * 100 : 0;

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
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">
                    Line items for {proposal.title}
                  </caption>
                  <thead>
                    <tr className="border-border text-muted-foreground border-b">
                      <th scope="col" className="pb-2 font-medium">
                        Description
                      </th>
                      <th
                        scope="col"
                        className="pb-2 text-right font-medium whitespace-nowrap"
                      >
                        Qty
                      </th>
                      <th
                        scope="col"
                        className="hidden pb-2 text-right font-medium whitespace-nowrap @[520px]:table-cell"
                      >
                        Rate
                      </th>
                      <th
                        scope="col"
                        className="pb-2 text-right font-medium whitespace-nowrap"
                      >
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposal.items.map((item) => (
                      <tr key={item.id} className="border-border border-b">
                        <td className="py-3 pr-4">{item.description}</td>
                        <td className="py-3 text-right tabular-nums">
                          {formatNumber(Number(item.quantity))}
                        </td>
                        <td className="hidden py-3 text-right tabular-nums @[520px]:table-cell">
                          {formatCurrency(item.rate)}
                        </td>
                        <td className="py-3 text-right font-medium tabular-nums">
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

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
