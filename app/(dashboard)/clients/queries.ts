import "server-only";
import { unstable_rethrow } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { AppError, logError } from "@/lib/errors";

import { clients } from "@/src/db/schema/clients";
import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/src/db";
import { clientIdSchema, clientListParamsSchema } from "./schema";

// Spelled out: in a single-table select Drizzle leaves column names
// unqualified, and inside a subquery "id" would bind to the inner table.
const CLIENT_ID = sql.raw(`"clients"."id"`);

/** Sent, unpaid invoice totals. */
const owes = sql<string>`(
  select coalesce(sum(i.total), 0) from invoices i
  where i.client_id = ${CLIENT_ID} and i.deleted_at is null and i.status = 'sent'
)`;
const activeProjects = sql<number>`(
  select count(*)::int from projects p
  where p.client_id = ${CLIENT_ID} and p.deleted_at is null and p.status <> 'completed'
)`;

/**
 * The clients page: one page of rows with what each client owes, their active
 * work and latest activity, plus chip counts. Two queries in parallel.
 */
export async function getClientList(rawParams: unknown) {
  try {
    const user = await requireUser();
    const { page, pageSize, search, view, status } =
      clientListParamsSchema.parse(rawParams ?? {});

    const base = [eq(clients.userId, user.id), isNull(clients.deletedAt)];
    if (search) {
      const pattern = `%${search}%`;
      base.push(
        sql`(${clients.name} ilike ${pattern} or ${clients.company} ilike ${pattern} or ${clients.email} ilike ${pattern})`,
      );
    }
    if (status) base.push(eq(clients.status, status));

    const views = {
      owes: sql`${owes} > 0`,
      active: sql`${activeProjects} > 0`,
      idle: sql`${activeProjects} = 0`,
    };

    const [rows, [totals]] = await Promise.all([
      db
        .select({
          id: clients.id,
          name: clients.name,
          company: clients.company,
          email: clients.email,
          phone: clients.phone,
          status: clients.status,
          createdAt: clients.createdAt,
          owes,
          activeProjects,
          late: sql<boolean>`exists(
            select 1 from invoices i
            where i.client_id = ${CLIENT_ID} and i.deleted_at is null
              and i.status = 'sent' and i.due_date < current_date
              and i.payment_claimed_at is null
          )`,
          lifetime: sql<string>`(
            select coalesce(sum(i.total), 0) from invoices i
            where i.client_id = ${CLIENT_ID} and i.deleted_at is null
              and i.status in ('sent', 'paid')
          )`,
        })
        .from(clients)
        .where(and(...base, ...(view ? [views[view]] : [])))
        .orderBy(
          sql`case ${clients.status} when 'active' then 0 when 'lead' then 1 when 'inactive' then 2 else 3 end`,
          desc(clients.createdAt),
        )
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db
        .select({
          all: count(),
          owes: sql<number>`count(*) filter (where ${views.owes})`.mapWith(
            Number,
          ),
          active: sql<number>`count(*) filter (where ${views.active})`.mapWith(
            Number,
          ),
          idle: sql<number>`count(*) filter (where ${views.idle})`.mapWith(
            Number,
          ),
          owesSum: sql<string>`coalesce(sum(${owes}), 0)::text`,
          // Per-status groups follow the chosen chip, so they match the rows shown.
          ...Object.fromEntries(
            (["active", "lead", "inactive", "archived"] as const).flatMap(
              (s) => {
                const where = sql`${clients.status} = ${s}${view ? sql` and ${views[view]}` : sql``}`;
                return [
                  [
                    `${s}Count`,
                    sql<number>`count(*) filter (where ${where})`.mapWith(
                      Number,
                    ),
                  ],
                  [
                    `${s}Owes`,
                    sql<string>`coalesce(sum(${owes}) filter (where ${where}), 0)::text`,
                  ],
                ];
              },
            ),
          ),
        })
        .from(clients)
        .where(and(...base)),
    ]);

    const counts = {
      all: totals?.all ?? 0,
      owes: totals?.owes ?? 0,
      active: totals?.active ?? 0,
      idle: totals?.idle ?? 0,
    };
    const total = view ? counts[view] : counts.all;

    return {
      clients: rows.map((row) => ({
        ...row,
        owes: String(row.owes),
        lifetime: String(row.lifetime),
      })),
      counts,
      groups: (
        [
          ["active", "Active"],
          ["lead", "Lead"],
          ["inactive", "Inactive"],
          ["archived", "Archived"],
        ] as const
      ).map(([key, label]) => {
        const group = totals as Record<string, unknown> | undefined;
        return {
          key,
          label,
          count: Number(group?.[`${key}Count`] ?? 0),
          sum: String(group?.[`${key}Owes`] ?? "0"),
        };
      }),
      owesSum: totals?.owesSum ?? "0",
      view: view ?? null,
      status: status ?? null,
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

    const [row] = await db
      .select({
        owes,
        activeProjects,
        late: sql<boolean>`exists(
          select 1 from invoices i
          where i.client_id = ${CLIENT_ID} and i.deleted_at is null
            and i.status = 'sent' and i.due_date < current_date
            and i.payment_claimed_at is null
        )`,
        lifetime: sql<string>`(
          select coalesce(sum(i.total), 0) from invoices i
          where i.client_id = ${CLIENT_ID} and i.deleted_at is null
            and i.status in ('sent', 'paid')
        )`,
        sentInvoices: countOf("invoices", "and t.status in ('sent', 'paid')"),
        projects: countOf("projects"),
        proposals: countOf("proposals"),
        invoices: countOf("invoices"),
      })
      .from(clients)
      .where(
        and(
          eq(clients.id, parsed.data),
          eq(clients.userId, user.id),
          isNull(clients.deletedAt),
        ),
      )
      .limit(1);

    if (!row) return null;
    return { ...row, owes: String(row.owes), lifetime: String(row.lifetime) };
  } catch (error) {
    unstable_rethrow(error);
    logError("getClientSummary", error);
    if (error instanceof AppError) throw error;
    throw new AppError("FETCH_FAILED", "Could not load this client.");
  }
}
