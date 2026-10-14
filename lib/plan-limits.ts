import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/src/db";
import { clients } from "@/src/db/schema/clients";
import { invoices } from "@/src/db/schema/invoices";
import { projects } from "@/src/db/schema/projects";
import { proposals } from "@/src/db/schema/proposals";
import { unstable_rethrow } from "next/navigation";
import { getEffectivePlan } from "@/lib/billing/plan";
import { requireUser } from "@/lib/current-user";
import { AppError, logError } from "@/lib/errors";
import { PLANS, type PlanLimits } from "@/lib/plans";
import {
  firstFullLimit,
  limitReached,
  planLimitMessage,
  type LimitKind,
  type PlanUsageCounts,
} from "@/lib/plan-limit-rules";

type Executor = Pick<typeof db, "execute">;

/**
 * What the limits measure, in one round trip: live clients, projects and
 * proposals, and every invoice created this UTC month (deleted ones too, so
 * send-then-delete can't refill the month).
 */
export async function countPlanUsage(
  executor: Executor,
  userId: string,
): Promise<PlanUsageCounts> {
  const month = sql`date_trunc('month', now(), 'UTC')`;
  const [row] = await executor.execute<PlanUsageCounts>(sql`
    select
      (select count(*)::int from ${clients}
        where ${clients.userId} = ${userId} and ${clients.deletedAt} is null) as "clients",
      (select count(*)::int from ${projects}
        where ${projects.userId} = ${userId} and ${projects.deletedAt} is null) as "projects",
      (select count(*)::int from ${proposals}
        where ${proposals.userId} = ${userId} and ${proposals.deletedAt} is null) as "proposals",
      (select count(*)::int from ${invoices}
        where ${invoices.userId} = ${userId} and ${invoices.createdAt} >= ${month}
          and ${invoices.createdAt} < ${month} + interval '1 month') as "invoicesPerMonth"`);
  return {
    clients: row?.clients ?? 0,
    projects: row?.projects ?? 0,
    proposals: row?.proposals ?? 0,
    invoicesPerMonth: row?.invoicesPerMonth ?? 0,
  };
}

/** The user's limits, or null when their plan has none. */
export async function planLimitsFor(userId: string): Promise<PlanLimits | null> {
  const { plan } = await getEffectivePlan(userId);
  const limits = PLANS[plan].limits;
  return Object.values(limits).every((n) => n === Infinity) ? null : limits;
}

/**
 * Call first inside the transaction that creates the rows. The per-user
 * advisory lock makes count-then-insert atomic, so two tabs can't both take
 * the last slot. Throws a PLAN_LIMIT AppError with a message for the user.
 */
export async function assertWithinPlan(
  tx: Executor,
  userId: string,
  limits: PlanLimits | null,
  kinds: readonly LimitKind[],
): Promise<void> {
  if (!limits || kinds.length === 0) return;
  // Seed 1 keeps this lock apart from the email limits' lock (seed 0).
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${userId}, 1))`);
  const full = firstFullLimit(await countPlanUsage(tx, userId), limits, kinds);
  if (full) throw new AppError("PLAN_LIMIT", planLimitMessage(full, limits[full]));
}

/**
 * For "New ..." pages: the limit message when the signed-in user can't create
 * one more of this kind, else null. The action checks again on save.
 */
export async function planBlockMessage(kind: LimitKind): Promise<string | null> {
  try {
    const user = await requireUser();
    const limits = await planLimitsFor(user.id);
    if (!limits || limits[kind] === Infinity) return null;
    const usage = await countPlanUsage(db, user.id);
    return limitReached(usage, limits, kind) ? planLimitMessage(kind, limits[kind]) : null;
  } catch (error) {
    unstable_rethrow(error);
    logError("planBlockMessage", error);
    return null;
  }
}
