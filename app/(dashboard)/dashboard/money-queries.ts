import "server-only";
import { unstable_rethrow } from "next/navigation";
import {
  and,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { requireUser } from "@/lib/current-user";
import { logError } from "@/lib/errors";
import { db } from "@/src/db";
import { invoices } from "@/src/db/schema/invoices";
import { proposals } from "@/src/db/schema/proposals";

const CHART_MONTHS = 6;

// Same split as the invoices page: sent and not yet due vs past due.
const isOutstanding = sql`${invoices.status} = 'sent' and ${invoices.dueDate} >= current_date`;
const isOverdue = sql`${invoices.status} = 'sent' and ${invoices.dueDate} < current_date`;

export type RevenueMonth = {
  /** First day of the month, "YYYY-MM-01". */
  month: string;
  paid: string;
  invoiced: string;
};

export type DashboardMoney = {
  /** Every figure is in this one currency; other currencies are left out. */
  currency: string;
  hasOtherCurrencies: boolean;
  paidThisMonth: string;
  /** Paid over the same days of last month, for a fair comparison. */
  paidLastMonthSoFar: string;
  outstanding: string;
  outstandingCount: number;
  overdue: string;
  overdueCount: number;
  oldestOverdueDays: number | null;
  awaitingReply: string;
  awaitingReplyCount: number;
  months: RevenueMonth[];
};

/** Money figures for the stat tiles and revenue chart; null on failure. */
export async function getDashboardMoney(): Promise<DashboardMoney | null> {
  try {
    const user = await requireUser();
    const mine = and(eq(invoices.userId, user.id), isNull(invoices.deletedAt));

    // The currency most sent invoices use; USD for a brand-new account.
    const [main] = await db
      .select({ currency: invoices.currency })
      .from(invoices)
      .where(and(mine, ne(invoices.status, "draft")))
      .groupBy(invoices.currency)
      .orderBy(desc(count()), invoices.currency)
      .limit(1);
    const currency = main?.currency ?? "USD";
    const inCurrency = eq(invoices.currency, currency);

    const [totalsRows, monthRows, proposalRows] = await Promise.all([
      db
        .select({
          paidThisMonth: sql<string>`coalesce(sum(${invoices.total}) filter (where ${inCurrency} and ${invoices.status} = 'paid' and ${invoices.paidAt} >= date_trunc('month', now())), 0)::text`,
          paidLastMonthSoFar: sql<string>`coalesce(sum(${invoices.total}) filter (where ${inCurrency} and ${invoices.status} = 'paid' and ${invoices.paidAt} >= date_trunc('month', now()) - interval '1 month' and ${invoices.paidAt} < now() - interval '1 month'), 0)::text`,
          outstanding: sql<string>`coalesce(sum(${invoices.total}) filter (where ${inCurrency} and ${isOutstanding}), 0)::text`,
          outstandingCount:
            sql<number>`count(*) filter (where ${inCurrency} and ${isOutstanding})`.mapWith(
              Number,
            ),
          overdue: sql<string>`coalesce(sum(${invoices.total}) filter (where ${inCurrency} and ${isOverdue}), 0)::text`,
          overdueCount:
            sql<number>`count(*) filter (where ${inCurrency} and ${isOverdue})`.mapWith(
              Number,
            ),
          oldestOverdueDays: sql<
            number | null
          >`max(current_date - ${invoices.dueDate}) filter (where ${inCurrency} and ${isOverdue})`,
          otherCurrencyCount:
            sql<number>`count(*) filter (where ${invoices.currency} <> ${currency} and ${invoices.status} <> 'draft')`.mapWith(
              Number,
            ),
        })
        .from(invoices)
        .where(mine),

      // One row per month, oldest first, including months with nothing.
      db.execute<{ month: string; paid: string; invoiced: string }>(sql`
        select
          to_char(m, 'YYYY-MM-DD') as month,
          coalesce(sum(i.total) filter (where i.status = 'paid' and date_trunc('month', i.paid_at) = m), 0)::text as paid,
          coalesce(sum(i.total) filter (where i.status <> 'draft' and date_trunc('month', coalesce(i.sent_at, i.issue_date::timestamptz)) = m), 0)::text as invoiced
        from generate_series(
          date_trunc('month', now()) - make_interval(months => ${CHART_MONTHS - 1}),
          date_trunc('month', now()),
          interval '1 month'
        ) as m
        left join ${invoices} i
          on i.user_id = ${user.id}
          and i.deleted_at is null
          and i.currency = ${currency}
          and i.status <> 'draft'
          and (
            date_trunc('month', i.paid_at) = m
            or date_trunc('month', coalesce(i.sent_at, i.issue_date::timestamptz)) = m
          )
        group by m
        order by m
      `),

      db
        .select({
          total: sql<string>`coalesce(sum(${proposals.total}), 0)::text`,
          count: count(),
        })
        .from(proposals)
        .where(
          and(
            eq(proposals.userId, user.id),
            isNull(proposals.deletedAt),
            eq(proposals.currency, currency),
            inArray(proposals.status, ["sent", "viewed"]),
            or(
              isNull(proposals.expiresAt),
              gt(proposals.expiresAt, sql`now()`),
            ),
          ),
        ),
    ]);

    const [totals] = totalsRows;
    const [awaiting] = proposalRows;

    return {
      currency,
      hasOtherCurrencies: (totals?.otherCurrencyCount ?? 0) > 0,
      paidThisMonth: totals?.paidThisMonth ?? "0",
      paidLastMonthSoFar: totals?.paidLastMonthSoFar ?? "0",
      outstanding: totals?.outstanding ?? "0",
      outstandingCount: totals?.outstandingCount ?? 0,
      overdue: totals?.overdue ?? "0",
      overdueCount: totals?.overdueCount ?? 0,
      oldestOverdueDays:
        totals?.oldestOverdueDays == null
          ? null
          : Number(totals.oldestOverdueDays),
      awaitingReply: awaiting?.total ?? "0",
      awaitingReplyCount: awaiting?.count ?? 0,
      months: [...monthRows].map((row) => ({
        month: row.month,
        paid: row.paid,
        invoiced: row.invoiced,
      })),
    };
  } catch (error) {
    unstable_rethrow(error);
    logError("getDashboardMoney", error);
    return null;
  }
}
