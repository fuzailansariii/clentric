import "server-only";
import { unstable_rethrow } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { AppError, logError } from "@/lib/errors";

import { clients } from "@/src/db/schema/clients";
import { and, desc, eq, isNull, sql, type SQLWrapper } from "drizzle-orm";
import { db } from "@/src/db";
import { clientIdSchema, clientListParamsSchema } from "./schema";
import {
  CLIENT_STATES,
  clientStateConfig,
  type ClientState,
} from "./client-state";

// Spelled out: in a single-table select Drizzle leaves column names
// unqualified, and inside a subquery "id" would bind to the inner table.
const CLIENT_ID = sql.raw(`"clients"."id"`);

const SENT_INVOICE = sql.raw(
  `i.client_id = "clients"."id" and i.deleted_at is null and i.status = 'sent'`,
);
const OVERDUE = sql.raw(
  `i.due_date < current_date and i.payment_claimed_at is null`,
);

/** Per-client facts the state is worked out from; each runs once per client. */
const factFields = {
  owes: sql<string>`(
    select coalesce(sum(i.total), 0) from invoices i where ${SENT_INVOICE}
  )`.as("owes"),
  unpaidInvoices: sql<number>`(
    select count(*)::int from invoices i where ${SENT_INVOICE}
  )`.as("unpaid_invoices"),
  overdueInvoices: sql<number>`(
    select count(*)::int from invoices i where ${SENT_INVOICE} and ${OVERDUE}
  )`.as("overdue_invoices"),
  daysLate: sql<number>`(
    select coalesce(current_date - min(i.due_date), 0)::int from invoices i
    where ${SENT_INVOICE} and ${OVERDUE}
  )`.as("days_late"),
  openProjects: sql<number>`(
    select count(*)::int from projects p
    where p.client_id = ${CLIENT_ID} and p.deleted_at is null and p.status <> 'completed'
  )`.as("open_projects"),
  // Same "awaiting reply" rule as the proposals list.
  proposalsOut: sql<number>`(
    select count(*)::int from proposals pr
    where pr.client_id = ${CLIENT_ID} and pr.deleted_at is null
      and pr.status in ('sent', 'viewed')
      and (pr.expires_at is null or pr.expires_at > now())
  )`.as("proposals_out"),
  // Anything sent or started: drafts alone still make a client "New".
  everWorked: sql<boolean>`(
    exists(select 1 from projects p where p.client_id = ${CLIENT_ID} and p.deleted_at is null)
    or exists(select 1 from proposals pr where pr.client_id = ${CLIENT_ID} and pr.deleted_at is null and pr.status <> 'draft')
    or exists(select 1 from invoices i where i.client_id = ${CLIENT_ID} and i.deleted_at is null and i.status <> 'draft')
  )`.as("ever_worked"),
  archived: sql<boolean>`(${clients.status} = 'archived')`.as("archived"),
};

type StateFacts = Record<
  | "archived"
  | "overdueInvoices"
  | "openProjects"
  | "proposalsOut"
  | "unpaidInvoices"
  | "everWorked",
  SQLWrapper
>;

/** First matching rule wins, in the order of CLIENT_STATES (client-state.ts). */
function clientStateSql(f: StateFacts) {
  return sql<ClientState>`case
    when ${f.archived} then 'archived'
    when ${f.overdueInvoices} > 0 then 'overdue'
    when ${f.openProjects} > 0 then 'in_progress'
    when ${f.proposalsOut} > 0 then 'proposal_out'
    when ${f.unpaidInvoices} > 0 then 'owes'
    when not ${f.everWorked} then 'new'
    else 'quiet' end`;
}

/**
 * The clients page: one page of rows with each client's state and what they
 * owe, plus tab counts and group totals. Two queries in parallel.
 */
export async function getClientList(rawParams: unknown) {
  try {
    const user = await requireUser();
    const { page, pageSize, search, view } = clientListParamsSchema.parse(
      rawParams ?? {},
    );

    const base = [eq(clients.userId, user.id), isNull(clients.deletedAt)];
    if (search) {
      const pattern = `%${search}%`;
      base.push(
        sql`(${clients.name} ilike ${pattern} or ${clients.company} ilike ${pattern} or ${clients.email} ilike ${pattern})`,
      );
    }

    const facts = db
      .select({
        id: clients.id,
        name: clients.name,
        company: clients.company,
        email: clients.email,
        phone: clients.phone,
        createdAt: clients.createdAt,
        lifetime: sql<string>`(
          select coalesce(sum(i.total), 0) from invoices i
          where i.client_id = ${CLIENT_ID} and i.deleted_at is null
            and i.status in ('sent', 'paid')
        )`.as("lifetime"),
        ...factFields,
      })
      .from(clients)
      .where(and(...base))
      .as("f");

    const state = clientStateSql(facts);
    const notArchived = sql`not ${facts.archived}`;
    // "All" leaves archived clients out; they have their own tab.
    const views = {
      owes: sql`${notArchived} and ${facts.unpaidInvoices} > 0`,
      in_progress: sql`${notArchived} and ${facts.openProjects} > 0`,
      quiet: sql`${state} in ('new', 'quiet')`,
      archived: sql`${facts.archived}`,
    };
    const shown = view ? views[view] : notArchived;
    const rank = sql`array_position(array[${sql.join(
      CLIENT_STATES.map((s) => sql`${s}`),
      sql`, `,
    )}]::text[], ${state})`;

    const [rows, [totals]] = await Promise.all([
      db
        .select({
          id: facts.id,
          name: facts.name,
          company: facts.company,
          email: facts.email,
          phone: facts.phone,
          createdAt: facts.createdAt,
          lifetime: facts.lifetime,
          owes: facts.owes,
          unpaidInvoices: facts.unpaidInvoices,
          overdueInvoices: facts.overdueInvoices,
          daysLate: facts.daysLate,
          openProjects: facts.openProjects,
          proposalsOut: facts.proposalsOut,
          state,
        })
        .from(facts)
        .where(shown)
        .orderBy(rank, desc(facts.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db
        .select({
          all: sql<number>`count(*) filter (where ${notArchived})`.mapWith(
            Number,
          ),
          owes: sql<number>`count(*) filter (where ${views.owes})`.mapWith(
            Number,
          ),
          in_progress:
            sql<number>`count(*) filter (where ${views.in_progress})`.mapWith(
              Number,
            ),
          quiet: sql<number>`count(*) filter (where ${views.quiet})`.mapWith(
            Number,
          ),
          archived:
            sql<number>`count(*) filter (where ${views.archived})`.mapWith(
              Number,
            ),
          owesSum: sql<string>`coalesce(sum(${facts.owes}) filter (where ${notArchived}), 0)::text`,
          // Groups follow the chosen tab, so they match the rows shown.
          ...Object.fromEntries(
            CLIENT_STATES.flatMap((s) => {
              const where = sql`${state} = ${s} and ${shown}`;
              return [
                [
                  `${s}Count`,
                  sql<number>`count(*) filter (where ${where})`.mapWith(Number),
                ],
                [
                  `${s}Owes`,
                  sql<string>`coalesce(sum(${facts.owes}) filter (where ${where}), 0)::text`,
                ],
              ];
            }),
          ),
        })
        .from(facts),
    ]);

    const counts = {
      all: totals?.all ?? 0,
      owes: totals?.owes ?? 0,
      in_progress: totals?.in_progress ?? 0,
      quiet: totals?.quiet ?? 0,
      archived: totals?.archived ?? 0,
    };
    const total = view ? counts[view] : counts.all;
    const group = totals as Record<string, unknown> | undefined;

    return {
      clients: rows.map((row) => ({
        ...row,
        owes: String(row.owes),
        lifetime: String(row.lifetime),
      })),
      counts,
      groups: CLIENT_STATES.map((key) => ({
        key,
        label: clientStateConfig[key].label,
        count: Number(group?.[`${key}Count`] ?? 0),
        sum: String(group?.[`${key}Owes`] ?? "0"),
      })),
      owesSum: totals?.owesSum ?? "0",
      view: view ?? null,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  } catch (error) {
    unstable_rethrow(error);
    logError("getClientList", error);
    if (error instanceof AppError) throw error;
    throw new AppError("FETCH_FAILED", "Could not load clients.");
  }
}

export type ClientListRow = Awaited<
  ReturnType<typeof getClientList>
>["clients"][number];

// Get client by  clientsID
export async function getClientById(clientId: string) {
  try {
    const parsed = clientIdSchema.safeParse(clientId);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid client ID.");
    }

    const user = await requireUser();

    const [client] = await db
      .select()
      .from(clients)
      .where(
        and(
          eq(clients.id, parsed.data),
          eq(clients.userId, user.id),
          isNull(clients.deletedAt),
        ),
      )
      .limit(1);
    return client ?? null;
  } catch (error) {
    unstable_rethrow(error);
    logError("clientByIdFetchFailed", error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("FETCH_FAILED", "Could not load client");
  }
}

// Get client options for project creation (client picker)
export async function getClientOptions() {
  try {
    const user = await requireUser();

    const rows = await db
      .select({
        id: clients.id,
        name: clients.name,
        company: clients.company,
        // Prefills hour lines in the invoice builder.
        hourlyRate: clients.hourlyRate,
        hasEmail: sql<boolean>`coalesce(${clients.email}, '') <> ''`,
        // Named in the "Send?" confirm.
        email: clients.email,
      })
      .from(clients)
      .where(and(eq(clients.userId, user.id), isNull(clients.deletedAt)))
      .orderBy(clients.name);

    return rows;
  } catch (error) {
    unstable_rethrow(error);
    logError("getClientOptions", error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("FETCH_FAILED", "Could not load clients");
  }
}

/** The client page's money strip and tab counts, in one row. */
export async function getClientSummary(clientId: string) {
  try {
    const parsed = clientIdSchema.safeParse(clientId);
    if (!parsed.success) return null;

    const user = await requireUser();
    const countOf = (table: string, extra = "") =>
      sql<number>`(
        select count(*)::int from ${sql.raw(table)} t
        where t.client_id = ${CLIENT_ID} and t.deleted_at is null ${sql.raw(extra)}
      )`;

    const facts = db
      .select({
        lifetime: sql<string>`(
          select coalesce(sum(i.total), 0) from invoices i
          where i.client_id = ${CLIENT_ID} and i.deleted_at is null
            and i.status in ('sent', 'paid')
        )`.as("lifetime"),
        sentInvoices: countOf(
          "invoices",
          "and t.status in ('sent', 'paid')",
        ).as("sent_invoices"),
        projects: countOf("projects").as("projects"),
        proposals: countOf("proposals").as("proposals"),
        invoices: countOf("invoices").as("invoices"),
        ...factFields,
      })
      .from(clients)
      .where(
        and(
          eq(clients.id, parsed.data),
          eq(clients.userId, user.id),
          isNull(clients.deletedAt),
        ),
      )
      .limit(1)
      .as("f");

    const [row] = await db
      .select({
        lifetime: facts.lifetime,
        sentInvoices: facts.sentInvoices,
        projects: facts.projects,
        proposals: facts.proposals,
        invoices: facts.invoices,
        owes: facts.owes,
        unpaidInvoices: facts.unpaidInvoices,
        overdueInvoices: facts.overdueInvoices,
        daysLate: facts.daysLate,
        openProjects: facts.openProjects,
        proposalsOut: facts.proposalsOut,
        state: clientStateSql(facts),
      })
      .from(facts);

    if (!row) return null;
    return { ...row, owes: String(row.owes), lifetime: String(row.lifetime) };
  } catch (error) {
    unstable_rethrow(error);
    logError("getClientSummary", error);
    if (error instanceof AppError) throw error;
    throw new AppError("FETCH_FAILED", "Could not load this client.");
  }
}
