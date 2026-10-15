import { unstable_rethrow } from "next/navigation";
import { and, asc, count, desc, eq, isNull, sql } from "drizzle-orm";
import { requireUser } from "@/lib/current-user";
import { AppError, logError } from "@/lib/errors";

import { db } from "@/src/db";
import { clients } from "@/src/db/schema/clients";
import { proposals } from "@/src/db/schema/proposals";
import { projects } from "@/src/db/schema/projects";
import { proposalIdSchema, proposalListParamsSchema } from "./schema";
import { activityLog } from "@/src/db/schema/activity-logs";
import {
  issuerUserColumns,
  liveIssuer,
  resolveIssuer,
} from "@/lib/issuer-snapshot";
import { logoSrc } from "@/lib/logo-url";
import { getPlanFeatures } from "@/lib/billing";
import { proposalState } from "./proposal-state";
import { clientIdSchema } from "../clients/schema";
import { proposalItems } from "@/src/db/schema/proposal-items";
import { proposalMilestones } from "@/src/db/schema/proposal-milestones";

import type { ProposalStatus } from "./proposal-status-config";

// Counted in the list query rather than by fetching milestones: the list
// only ever shows "2 of 2", never the stages themselves.
const milestoneCount =
  sql<number>`(select count(*) from ${proposalMilestones} where ${proposalMilestones.proposalId} = ${proposals.id})`.mapWith(
    Number,
  );

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

export async function getProposalById(proposalId: string) {
  try {
    const parsed = proposalIdSchema.safeParse(proposalId);
    // A malformed id can't match anything — same as any missing proposal.
    if (!parsed.success) return null;

    const user = await requireUser();

    // Started first so it runs alongside the proposal query.
    const features = getPlanFeatures(user.id);
    // One query: the ownership check on the proposal gates its client and
    // line items, so neither can come back for a row this user doesn't own.
    const row = await db.query.proposals.findFirst({
      where: and(
        eq(proposals.id, parsed.data),
        eq(proposals.userId, user.id),
        isNull(proposals.deletedAt),
      ),
      with: {
        client: {
          columns: { id: true, name: true, company: true, email: true },
        },
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
            timeframe: true,
            sortOrder: true,
          },
          orderBy: [
            asc(proposalMilestones.sortOrder),
            asc(proposalMilestones.id),
          ],
        },
        user: {
          columns: { ...issuerUserColumns, logoUrl: true, brandColor: true },
        },
      },
      extras: {
        // Sends are only recorded in the activity log.
        sentAt: sql<string | null>`(
          select max(a.created_at) from activity_logs a
          where a.entity_id = ${proposals.id}
            and a.user_id = ${user.id}
            and a.action = 'proposal.sent'
        )`.as("sent_at"),
        expiresInDays: sql<
          number | null
        >`(${proposals.expiresAt}::date - current_date)`.as("expires_in_days"),
      },
    });

    if (!row) return null;

    const { user: owner, ...proposal } = row;
    const status = getProposalDisplayStatus(row);
    const expiresInDays =
      proposal.expiresInDays === null ? null : Number(proposal.expiresInDays);

    return {
      ...proposal,
      // The stored status is the record; this is what the screen should say.
      status,
      state: proposalState({ status, expiresInDays }),
      sentAt: proposal.sentAt ? new Date(proposal.sentAt) : null,
      expiresInDays,
      // Sent proposals show the details they went out with; drafts the live ones.
      issuer: owner
        ? resolveIssuer(proposal.issuerSnapshot, liveIssuer(owner))
        : null,
      ...((await features).customBranding
        ? {
            logoSrc: owner?.logoUrl ? logoSrc(owner.logoUrl) : null,
            brandColor: owner?.brandColor ?? null,
          }
        : { logoSrc: null, brandColor: null }),
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

const sumWhere = (where: ReturnType<typeof sql>) =>
  sql<string>`coalesce(sum(${proposals.total}) filter (where ${where}), 0)::text`;
const countWhere = (where: ReturnType<typeof sql>) =>
  sql<number>`count(*) filter (where ${where})`.mapWith(Number);
const toNumber = (value: number | string | null) =>
  value === null ? null : Number(value);

/**
 * The proposals page: one page of rows for the chosen chip, chip counts and
 * the money strip (search applied, chip not). Two queries in parallel.
 */
export async function getProposalList(
  rawParams: unknown,
  scope: { clientId?: string } = {},
) {
  try {
    const user = await requireUser();
    const { page, pageSize, search, view } = proposalListParamsSchema.parse(
      rawParams ?? {},
    );

    const base = [eq(proposals.userId, user.id), isNull(proposals.deletedAt)];
    if (scope.clientId) {
      const parsedClientId = clientIdSchema.safeParse(scope.clientId);
      if (!parsedClientId.success) {
        throw new AppError("VALIDATION_ERROR", "Invalid client ID.");
      }
      base.push(eq(proposals.clientId, parsedClientId.data));
    }
    if (search) {
      const pattern = `%${search}%`;
      base.push(
        sql`(${proposals.title} ilike ${pattern} or ${clients.name} ilike ${pattern} or ${clients.company} ilike ${pattern})`,
      );
    }

    const live = sql`(${proposals.expiresAt} is null or ${proposals.expiresAt} > now())`;
    const views = {
      draft: sql`${proposals.status} = 'draft'`,
      awaiting: sql`${proposals.status} in ('sent', 'viewed') and ${live}`,
      accepted: sql`${proposals.status} = 'accepted'`,
      closed: sql`(${proposals.status} in ('rejected', 'revoked', 'expired') or (${proposals.status} in ('sent', 'viewed') and not ${live}))`,
    };
    const acceptedThisQuarter = sql`${proposals.status} = 'accepted' and ${proposals.acceptedAt} >= date_trunc('quarter', now())`;
    // Groups in the order the list shows them: what's waiting on a reply first.
    const groupRank = sql`case when ${views.awaiting} then 0 when ${views.draft} then 1 when ${views.accepted} then 2 else 3 end`;
    const declined = sql`${proposals.status} = 'rejected'`;

    const [rows, [totals]] = await Promise.all([
      db
        .select({
          id: proposals.id,
          title: proposals.title,
          token: proposals.token,
          total: proposals.total,
          currency: proposals.currency,
          status: proposals.status,
          expiresAt: proposals.expiresAt,
          viewedAt: proposals.viewedAt,
          acceptedAt: proposals.acceptedAt,
          rejectedAt: proposals.rejectedAt,
          revokedAt: proposals.revokedAt,
          createdAt: proposals.createdAt,
          updatedAt: proposals.updatedAt,
          depositPercent: proposals.depositPercent,
          clientName: clients.name,
          clientEmail: clients.email,
          clientHasEmail: sql<boolean>`coalesce(${clients.email}, '') <> ''`,
          milestoneCount,
          daysSinceUpdate:
            sql<number>`(current_date - ${proposals.updatedAt}::date)`.mapWith(
              Number,
            ),
          daysSinceViewed: sql<
            number | null
          >`(current_date - ${proposals.viewedAt}::date)`,
          expiresInDays: sql<
            number | null
          >`(${proposals.expiresAt}::date - current_date)`,
          // Sends are only recorded in the activity log.
          sentAt: sql<string | null>`(
            select max(a.created_at) from ${activityLog} a
            where a.entity_id = ${proposals.id}
              and a.user_id = ${user.id}
              and a.action = 'proposal.sent'
          )`,
          projectId: sql<string | null>`(
            select p.id from ${projects} p
            where p.proposal_id = ${proposals.id}
              and p.user_id = ${user.id}
              and p.deleted_at is null
            limit 1
          )`,
        })
        .from(proposals)
        .innerJoin(clients, eq(proposals.clientId, clients.id))
        .where(and(...base, ...(view ? [views[view]] : [])))
        .orderBy(groupRank, desc(proposals.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db
        .select({
          all: count(),
          draft: countWhere(views.draft),
          awaiting: countWhere(views.awaiting),
          awaitingSum: sumWhere(views.awaiting),
          accepted: countWhere(views.accepted),
          closed: countWhere(views.closed),
          declined: countWhere(declined),
          quarter: countWhere(acceptedThisQuarter),
          quarterSum: sumWhere(acceptedThisQuarter),
          allSum: sql<string>`coalesce(sum(${proposals.total}), 0)::text`,
          acceptedSum: sumWhere(views.accepted),
          draftSum: sumWhere(views.draft),
          closedSum: sumWhere(views.closed),
        })
        .from(proposals)
        .innerJoin(clients, eq(proposals.clientId, clients.id))
        .where(and(...base)),
    ]);

    const counts = {
      all: totals?.all ?? 0,
      draft: totals?.draft ?? 0,
      awaiting: totals?.awaiting ?? 0,
      accepted: totals?.accepted ?? 0,
      closed: totals?.closed ?? 0,
    };
    const total = view ? counts[view] : counts.all;

    return {
      proposals: rows.map((row) => {
        const shaped = {
          ...row,
          status: getProposalDisplayStatus(row),
          sentAt: row.sentAt ? new Date(row.sentAt) : null,
          daysSinceViewed: toNumber(row.daysSinceViewed),
          expiresInDays: toNumber(row.expiresInDays),
        };
        return { ...shaped, state: proposalState(shaped) };
      }),
      counts,
      groups: [
        {
          key: "awaiting",
          label: "Awaiting reply",
          count: counts.awaiting,
          sum: totals?.awaitingSum ?? "0",
        },
        {
          key: "draft",
          label: "Drafts",
          count: counts.draft,
          sum: totals?.draftSum ?? "0",
        },
        {
          key: "accepted",
          label: "Accepted",
          count: counts.accepted,
          sum: totals?.acceptedSum ?? "0",
        },
        {
          key: "closed",
          label: "Closed",
          count: counts.closed,
          sum: totals?.closedSum ?? "0",
        },
      ],
      strip: {
        awaiting: { count: counts.awaiting, sum: totals?.awaitingSum ?? "0" },
        quarter: {
          count: totals?.quarter ?? 0,
          sum: totals?.quarterSum ?? "0",
        },
        proposed: totals?.allSum ?? "0",
        accepted: totals?.acceptedSum ?? "0",
        win: {
          won: counts.accepted,
          decided: counts.accepted + (totals?.declined ?? 0),
        },
      },
      view: view ?? null,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  } catch (error) {
    unstable_rethrow(error);
    logError("getProposalList", error);
    if (error instanceof AppError) throw error;
    throw new AppError("FETCH_FAILED", "Could not load proposals.");
  }
}

export type ProposalListRow = Awaited<
  ReturnType<typeof getProposalList>
>["proposals"][number];
