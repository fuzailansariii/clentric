import { formatCurrency, formatNumber } from "@/lib/format-currency";

type ProposalPreviewProps = {
  title?: string;
  clientName?: string;
  clientCompany?: string | null;
  content?: string;
  items: { description?: string; quantity?: unknown; rate?: unknown }[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  /** 0 means the link never expires. */
  expiresInDays: number;
};

/**
 * A paper-style rendering of what the client will open.
 *
 * Deliberately not the invoice preview: an invoice is a figure to be paid, so
 * its preview is a compact summary card. A proposal is a document someone
 * reads end to end before deciding, so this shows the whole sheet — title,
 * who it is for, the scope prose and every line.
 */
export default function ProposalPreview({
  title,
  clientName,
  clientCompany,
  content,
  items,
  subtotal,
  taxRate,
  taxAmount,
  total,
  expiresInDays,
}: ProposalPreviewProps) {
  const filledItems = items.filter(
    (item) => item.description?.trim() || Number(item.rate ?? 0) > 0,
  );

  return (
    <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
      {/* Masthead */}
      <div className="border-border bg-muted/40 border-b px-6 py-5">
        <p className="text-muted-foreground font-mono text-[10px] font-medium tracking-[0.2em] uppercase">
          Proposal
        </p>
        <h2 className="font-space mt-2 text-lg leading-snug font-semibold tracking-tight text-balance">
          {title?.trim() || (
            <span className="text-muted-foreground/60">Untitled proposal</span>
          )}
        </h2>
      </div>

      <div className="flex flex-col gap-5 px-6 py-5">
        <div>
          <p className="text-muted-foreground font-mono text-[10px] font-medium tracking-[0.18em] uppercase">
            Prepared for
          </p>
          <p className="mt-1.5 text-sm font-medium">
            {clientCompany?.trim() || clientName?.trim() || (
              <span className="text-muted-foreground/60">
                No client selected
              </span>
            )}
          </p>
          {clientCompany?.trim() && clientName?.trim() && (
            <p className="text-muted-foreground text-xs">{clientName}</p>
          )}
        </div>

        {content?.trim() && (
          <div className="border-border border-t pt-4">
            <p className="text-muted-foreground text-[13px] leading-relaxed whitespace-pre-line">
              {/* Long scope notes would push the totals out of sight in a
                  sticky panel, so the preview shows the opening only. */}
              {content.length > 320 ? `${content.slice(0, 320)}…` : content}
            </p>
          </div>
        )}

        <div className="border-border border-t pt-4">
          {filledItems.length === 0 ? (
            <p className="text-muted-foreground/60 text-[13px]">
              Line items will appear here.
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {filledItems.map((item, index) => {
                const quantity = Number(item.quantity ?? 0);
                const rate = Number(item.rate ?? 0);
                return (
                  <li
                    key={index}
                    className="flex items-baseline justify-between gap-4 text-[13px]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate">
                        {item.description?.trim() || "Untitled item"}
                      </span>
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {formatNumber(quantity)} ×{" "}
                        {formatCurrency(String(rate))}
                      </span>
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">
                      {formatCurrency(String(quantity * rate))}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <dl className="border-border flex flex-col gap-1.5 border-t pt-4 text-[13px]">
          <div className="text-muted-foreground flex justify-between">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{formatCurrency(String(subtotal))}</dd>
          </div>
          <div className="text-muted-foreground flex justify-between">
            <dt>Tax{taxRate > 0 ? ` (${formatNumber(taxRate)}%)` : ""}</dt>
            <dd className="tabular-nums">
              {formatCurrency(String(taxAmount))}
            </dd>
          </div>
          <div className="border-border mt-1.5 flex items-baseline justify-between border-t pt-2.5">
            <dt className="font-space text-sm font-semibold">Total</dt>
            <dd className="font-space text-base font-semibold tabular-nums">
              {formatCurrency(String(total))}
            </dd>
          </div>
        </dl>

        {/* The window, not a date. Sending re-bases expiry off the send
            time, so an absolute date shown while drafting would be wrong for
            any proposal not sent the same day. */}
        <p className="text-muted-foreground border-border border-t pt-4 text-xs">
          {expiresInDays > 0
            ? `Link expires ${expiresInDays} days after sending`
            : "Link does not expire"}
        </p>
      </div>
    </div>
  );
}
