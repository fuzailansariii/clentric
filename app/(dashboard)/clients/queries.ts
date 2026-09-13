import "server-only";
import { requireUser } from "@/lib/current-user";
import { AppError, logError } from "@/lib/errors";
import { sumStatusCounts, toStatusCounts } from "@/lib/status-counts";
import { clients, clientStatusEnum } from "@/src/db/schema/clients";
import { and, count, desc, eq, ilike, isNull } from "drizzle-orm";
import { db } from "@/src/db";
import { clientIdSchema, clientSearchParamsSchema } from "./schema";

// Get all clients
export async function getClients(rawParams: unknown) {
  try {
    const user = await requireUser();

    const { page, pageSize, search, status } = clientSearchParamsSchema.parse(
      rawParams ?? {},
    );

    const offset = (page - 1) * pageSize;

    // Status tab counts ignore the status filter but honor the search, so
    // each tab's count matches what clicking it would list.
    const baseConditions = [
      eq(clients.userId, user.id),
      isNull(clients.deletedAt),
    ];
    if (search) baseConditions.push(ilike(clients.name, `%${search}%`));

    const listConditions = status
      ? [...baseConditions, eq(clients.status, status)]
      : baseConditions;

    // Two queries: the page of rows and the per-status counts. The list's
    // total is read from those counts — no separate COUNT(*).
    const [rows, statusRows] = await Promise.all([
      db
        .select()
        .from(clients)
        .where(and(...listConditions))
        .orderBy(desc(clients.createdAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ status: clients.status, value: count() })
        .from(clients)
        .where(and(...baseConditions))
        .groupBy(clients.status),
    ]);

    const statusCounts = toStatusCounts(clientStatusEnum.enumValues, statusRows);
    const allCount = sumStatusCounts(statusCounts);
    const total = status ? statusCounts[status] : allCount;

    return {
      clients: rows,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      statusCounts,
      allCount,
    };
  } catch (error) {
    logError("getClients", error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("FETCH_FAILED", "Could not load clients.");
  }
}

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
      })
      .from(clients)
      .where(and(eq(clients.userId, user.id), isNull(clients.deletedAt)))
      .orderBy(clients.name);

    return rows;
  } catch (error) {
    logError("getClientOptions", error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("FETCH_FAILED", "Could not load clients");
  }
}
