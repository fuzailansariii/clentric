import { formatCurrency, formatPercent } from "@/lib/format-currency";

type ProposalPreviewProps = {
  title?: string;
  clientName?: string;
  stages: {
    name?: string;
    timeframe?: string;
    items?: { description?: string; quantity?: unknown; rate?: unknown }[];
  }[];
  taxRate: number;
  taxAmount: number;
  total: number;
  /** 0 means the link never expires. */
  expiresInDays: number;
  /** 0 means no deposit is asked for. */
  depositPercent: number;
  depositAmount: number;
  /** 0 when not given. */
  deliveryDays: number;
  currency: string;
  /** The freelancer's brand colour, already resolved. */
  brand: string;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** A small live copy of what the client will open. */
export default function ProposalPreview({
  title,
  clientName,
  stages,
  taxRate,
  taxAmount,
  total,
  expiresInDays,
  depositPercent,
  depositAmount,
  deliveryDays,
  currency,
  brand,
}: ProposalPreviewProps) {
  const money = (n: number) => formatCurrency(String(n), currency);
  const named = stages.some((stage) => stage.name?.trim());

  const footnote = [
    expiresInDays ? `Link open ${plural(expiresInDays, "day")}` : "Link never expires",
    deliveryDays ? `delivery in ${plural(deliveryDays, "day")}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <section
      aria-label="Proposal preview"
      className="bg-card min-w-0 overflow-hidden rounded-lg border shadow-xs"
    >
      <div className="h-1" style={{ background: brand }} />
      <div className="p-4 sm:p-4.5">
        <p
          className="text-[10.5px] font-semibold tracking-[0.12em] uppercase"
          style={{ color: brand }}
        >
          Proposal
        </p>
        <p className="font-space mt-1 text-lg leading-snug font-semibold wrap-anywhere">
          {title?.trim() || "Untitled proposal"}
        </p>
        <p className="text-muted-foreground mb-3 text-[12.5px]">
          Prepared for {clientName || "your client"}
        </p>

        {stages.map((stage, index) => {
          const price = (stage.items ?? []).reduce(
            (sum, item) =>
              sum + (Number(item?.quantity) || 0) * (Number(item?.rate) || 0),
            0,
          );
          const label =
            stage.name?.trim() || (named ? `Stage ${index + 1}` : "Line items");
          return (
            <div
              key={index}
              className="flex justify-between gap-3 border-t py-2 text-[13px]"
            >
              <span className="min-w-0">
                <span className="block wrap-anywhere">{label}</span>
                {stage.timeframe?.trim() && (
                  <span className="text-muted-foreground block text-xs">
                    {stage.timeframe}
                  </span>
                )}
              </span>
              <span className="font-space tabular-nums">{money(price)}</span>
            </div>
          );
        })}

        <div className="border-t pt-2.5 text-[13px]">
          {taxAmount > 0 && (
            <div className="flex justify-between gap-3 py-0.5">
              <span className="text-muted-foreground">
                Tax ({formatPercent(taxRate)}%)
              </span>
              <span className="font-space tabular-nums">{money(taxAmount)}</span>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-3 pt-1 font-semibold">
            <span>Total</span>
            <span className="font-space text-lg font-medium tabular-nums">
              {money(total)}
            </span>
          </div>
          {depositPercent > 0 && (
            <div
              className="flex justify-between gap-3 pt-1 font-medium"
              style={{ color: brand }}
            >
              <span>Deposit to begin ({formatPercent(depositPercent)}%)</span>
              <span className="font-space tabular-nums">
                {money(depositAmount)}
              </span>
            </div>
          )}
        </div>

        <p className="text-muted-foreground mt-2.5 text-xs">
          {footnote}. Accepting creates the project.
        </p>
      </div>
    </section>
  );
}
