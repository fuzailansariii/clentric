import { unstable_rethrow } from "next/navigation";
import { and, asc, count, desc, eq, isNull, sql } from "drizzle-orm";
import { requireUser } from "@/lib/current-user";
import { AppError, logError } from "@/lib/errors";
import { sumStatusCounts, toStatusCounts } from "@/lib/status-counts";
import { db } from "@/src/db";
import { clients } from "@/src/db/schema/clients";
import { proposals, proposalStatusEnum } from "@/src/db/schema/proposals";
import { projects } from "@/src/db/schema/projects";
import { proposalIdSchema, proposalSearchParamsSchema } from "./schema";
import { clientIdSchema } from "../clients/schema";
import { proposalItems } from "@/src/db/schema/proposal-items";
import { proposalMilestones } from "@/src/db/schema/proposal-milestones";
import { invoices } from "@/src/db/schema/invoices";
import type { ProposalStatus } from "./proposal-status-config";

export type ProposalListItem = {
  id: string;
  title: string;
  clientName: string;
  clientCompany: string | null;
  total: string; // decimal(12,2) comes back from drizzle as a string
  currency: string;
  status: ProposalStatus;
  expiresAt: Date | null;
  viewedAt: Date | null;
  acceptedAt: Date | null;
  createdAt: Date;
  milestoneCount: number;
  depositPercent: string;
  /** null when no deposit invoice has been raised yet. */
  depositPaid: boolean | null;
};

export type ProposalSummary = {
  totalCount: number;
  total: string;
  acceptedCount: number;
  accepted: string;
  awaitingCount: number;
  awaiting: string;
  declinedCount: number;
  declined: string;
};

/**
 * An unanswered proposal past its expiry reads as expired without a job
 * having to rewrite the row, the same way an unpaid invoice past its due date
 * reads as overdue. Computed in SQL so filtering and counting agree with what
 * the table renders.
 */
// Counted in the list query rather than by fetching milestones: the list
// only ever shows "2 of 2", never the stages themselves.
const milestoneCount =
  sql<number>`(select count(*) from ${proposalMilestones} where ${proposalMilestones.proposalId} = ${proposals.id})`.mapWith(
    Number,
  );

const displayStatus = sql<ProposalStatus>`case when ${proposals.status} in ('sent', 'viewed') and ${proposals.expiresAt} is not null and ${proposals.expiresAt} <= now() then 'expired' else ${proposals.status}::text end`;

/** Applies the same expiry rule to an already-fetched row. */
export function getProposalDisplayStatus(row: {
  status: ProposalStatus;
  expiresAt: Date | null;
}): ProposalStatus {
  const unanswered = row.status === "sent" || row.status === "viewed";
  if (unanswered && row.expiresAt && row.expiresAt.getTime() <= Date.now()) {
    return "expired";
  }
  return row.status;
}

export async function getProposalsByUserId(
  rawParams: unknown,
  scope: { clientId?: string } = {},
) {
  try {
    const user = await requireUser();

    const { page, pageSize, search, status } = proposalSearchParamsSchema.parse(
      rawParams ?? {},
    );

    const baseConditions = [
      eq(proposals.userId, user.id),
      isNull(proposals.deletedAt),
    ];

    // Used by the client detail page to show only that client's proposals.
    if (scope.clientId) {
      const parsedClientId = clientIdSchema.safeParse(scope.clientId);
      if (!parsedClientId.success) {
        throw new AppError("VALIDATION_ERROR", "Invalid client ID.");
      }
      baseConditions.push(eq(proposals.clientId, parsedClientId.data));
    }

    if (search) {
      const pattern = `%${search}%`;
      baseConditions.push(
        sql`(${proposals.title} ilike ${pattern} or ${clients.name} ilike ${pattern} or ${clients.company} ilike ${pattern})`,
      );
    }

    const listConditions = status
      ? [...baseConditions, sql`${displayStatus} = ${status}`]
      : baseConditions;

    const offset = (page - 1) * pageSize;

    const [rows, summaryRows] = await Promise.all([
      db
        .select({
          id: proposals.id,
          title: proposals.title,
          total: proposals.total,
          currency: proposals.currency,
          status: proposals.status,
          expiresAt: proposals.expiresAt,
          viewedAt: proposals.viewedAt,
          acceptedAt: proposals.acceptedAt,
          createdAt: proposals.createdAt,
          clientName: clients.name,
          clientCompany: clients.company,
          milestoneCount,
          depositPercent: proposals.depositPercent,
          depositInvoiceStatus: invoices.status,
        })
        .from(proposals)
        .innerJoin(clients, eq(proposals.clientId, clients.id))
        .leftJoin(invoices, eq(proposals.depositInvoiceId, invoices.id))
        .where(and(...listConditions))
        .orderBy(desc(proposals.createdAt))
        .limit(pageSize)
        .offset(offset),

      // rollup() gives the per-status rows and the grand total (status null)
      // in one pass, so the tab counts and the stat cards cannot disagree.
      db
        .select({
          status: sql<ProposalStatus | null>`${displayStatus}`,
          value: count(),
          amount: sql<string>`coalesce(sum(${proposals.total}), 0)::text`,
        })
        .from(proposals)
        .innerJoin(clients, eq(proposals.clientId, clients.id))
        .where(and(...baseConditions))
        .groupBy(sql`rollup(${displayStatus})`),
    ]);

    const perStatus = summaryRows.flatMap((row) =>
      row.status === null
        ? []
        : [{ status: row.status, value: row.value, amount: row.amount }],
    );

    const statusCounts = toStatusCounts(
      proposalStatusEnum.enumValues,
      perStatus,
    );
    const allCount = sumStatusCounts(statusCounts);
    const total = status ? statusCounts[status] : allCount;

    // "Awaiting" is anything still with the client and still openable.
    const awaitingCount = statusCounts.sent + statusCounts.viewed;

    const amountFor = (key: ProposalStatus) =>
      perStatus.find((row) => row.status === key)?.amount ?? "0";

    const summary: ProposalSummary = {
      totalCount: allCount,
      total: summaryRows.find((row) => row.status === null)?.amount ?? "0",
      acceptedCount: statusCounts.accepted,
      accepted: amountFor("accepted"),
      awaitingCount,
      awaiting: (
        Number(amountFor("sent")) + Number(amountFor("viewed"))
      ).toFixed(2),
      declinedCount: statusCounts.rejected,
      declined: amountFor("rejected"),
    };

    return {
      proposals: rows.map(({ depositInvoiceStatus, ...row }) => ({
        ...row,
        status: getProposalDisplayStatus(row),
        // Only the freelancer's own "Mark as paid" click sets an invoice to
        // paid, so this badge reflects that and nothing the client clicked.
        depositPaid:
          depositInvoiceStatus === undefined || depositInvoiceStatus === null
            ? null
            : depositInvoiceStatus === "paid",
      })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      statusCounts,
      allCount,
      summary,
    };
  } catch (error) {
    unstable_rethrow(error);
    logError("getProposalsByUserId", error);
    if (error instanceof AppError) throw error;
    throw new AppError("FETCH_FAILED", "Could not load proposals.");
  }
}

export type ProposalListResult = Awaited<
  ReturnType<typeof getProposalsByUserId>
>;

export async function getProposalById(proposalId: string) {
  try {
    const parsed = proposalIdSchema.safeParse(proposalId);
    // A malformed id can't match anything — same as any missing proposal.
    if (!parsed.success) return null;

    const user = await requireUser();

    // One query: the ownership check on the proposal gates its client and
    // line items, so neither can come back for a row this user doesn't own.
    const row = await db.query.proposals.findFirst({
      where: and(
        eq(proposals.id, parsed.data),
        eq(proposals.userId, user.id),
        isNull(proposals.deletedAt),
      ),
      with: {
        client: { columns: { id: true, name: true, company: true } },
        items: {
          columns: {
            id: true,
            milestoneId: true,
            description: true,
            quantity: true,
            rate: true,
            amount: true,
          },
          orderBy: [asc(proposalItems.sortOrder), asc(proposalItems.id)],
        },
        milestones: {
          columns: {
            id: true,
            name: true,
            description: true,
            sortOrder: true,
          },
          orderBy: [
            asc(proposalMilestones.sortOrder),
            asc(proposalMilestones.id),
          ],
        },
      },
    });

    if (!row) return null;

    return {
      ...row,
      // The stored status is the record; this is what the screen should say.
      status: getProposalDisplayStatus(row),
    };
  } catch (error) {
    unstable_rethrow(error);
    logError("getProposalById", error);
    if (error instanceof AppError) throw error;
    throw new AppError("FETCH_FAILED", "Could not load this proposal.");
  }
}

export type ProposalDetail = NonNullable<
  Awaited<ReturnType<typeof getProposalById>>
>;

/**
 * The live project created from this proposal, if there is one.
 *
 * Scoped by user as well as proposal id: this feeds a link, and a link to
 * something the viewer does not own should not render at all.
 */
export async function getProjectForProposal(proposalId: string) {
  try {
    const parsed = proposalIdSchema.safeParse(proposalId);
    if (!parsed.success) return null;

    const user = await requireUser();

    const [row] = await db
      .select({ id: projects.id, title: projects.title })
      .from(projects)
      .where(
        and(
          eq(projects.proposalId, parsed.data),
          eq(projects.userId, user.id),
          isNull(projects.deletedAt),
        ),
      )
      .limit(1);

    return row ?? null;
  } catch (error) {
    unstable_rethrow(error);
    logError("getProjectForProposal", error);
    // A missing link is not worth failing the whole detail page for.
    return null;
  }
}

/** Badge count for the client detail page's Proposals tab. */
export async function countProposalsByClientId(
  clientId: string,
): Promise<number> {
  try {
    const parsed = clientIdSchema.safeParse(clientId);
    if (!parsed.success) return 0;

    const user = await requireUser();

    const rows = await db
      .select({ value: count() })
      .from(proposals)
      .where(
        and(
          eq(proposals.clientId, parsed.data),
          eq(proposals.userId, user.id),
          isNull(proposals.deletedAt),
        ),
      );

    return rows[0]?.value ?? 0;
  } catch (error) {
    unstable_rethrow(error);
    logError("countProposalsByClientId", error);
    return 0;
  }
}
