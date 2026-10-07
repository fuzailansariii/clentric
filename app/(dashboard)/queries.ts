import "server-only";
import { cache } from "react";
import { db } from "@/src/db";
import { users } from "@/src/db/schema/users";
import { invoices } from "@/src/db/schema/invoices";
import { proposals } from "@/src/db/schema/proposals";
import { logError } from "@/lib/errors";
import {
  and,
  count,
  eq,
  gt,
  inArray,
  isNull,
  or,
  sql,
} from "drizzle-orm";

// cache(): the dashboard layout and the dashboard page both read this in
// the same request; they share one database round trip.
export const getDashboardData = cache(async (userId: string) => {
  // The plan comes from getEffectivePlan(), not from this row.
  const profile = await db.query.users.findFirst({
    where: and(eq(users.id, userId), isNull(users.deletedAt)),
    // Named explicitly rather than selecting the whole row. This runs in the
    // dashboard layout, so it is on the path of every page in the app — an
    // implicit select breaks all of them the moment a column is added to the
    // schema ahead of its migration, and ships columns nothing here reads.
    columns: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      // Pending deletion: the layout shows the restore screen instead.
      deletionRequestedAt: true,
      // Empty until the first visit after sign-up; the layout records it.
      termsAcceptedAt: true,
    },
  });

  return { profile: profile ?? null };
});

export type SidebarCounts = { openProposals: number; overdueInvoices: number };

/** Nav badges; zeros on failure so the layout never breaks over a count. */
export async function getSidebarCounts(userId: string): Promise<SidebarCounts> {
  try {
    const [proposalRows, invoiceRows] = await Promise.all([
      db
        .select({ value: count() })
        .from(proposals)
        .where(
          and(
            eq(proposals.userId, userId),
            isNull(proposals.deletedAt),
            inArray(proposals.status, ["sent", "viewed"]),
            or(
              isNull(proposals.expiresAt),
              gt(proposals.expiresAt, sql`now()`),
            ),
          ),
        ),
      db
        .select({ value: count() })
        .from(invoices)
        .where(
          and(
            eq(invoices.userId, userId),
            isNull(invoices.deletedAt),
            eq(invoices.status, "sent"),
            sql`${invoices.dueDate} < current_date`,
          ),
        ),
    ]);

    return {
      openProposals: proposalRows[0]?.value ?? 0,
      overdueInvoices: invoiceRows[0]?.value ?? 0,
    };
  } catch (error) {
    logError("getSidebarCounts", error);
    return { openProposals: 0, overdueInvoices: 0 };
  }
}
