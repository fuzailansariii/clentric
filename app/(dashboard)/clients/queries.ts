import "server-only";
import { requireUser } from "@/lib/current-user";
import { AppError, logError } from "@/lib/errors";
import { clients, clientStatusEnum } from "@/src/db/schema/clients";
import { and, count, desc, eq, ilike, isNull } from "drizzle-orm";
import { db } from "@/src/db";
import { clientIdSchema } from "./schema";

type GetClientsParams = {
  search?: string;
  status?: (typeof clientStatusEnum.enumValues)[number];
  page?: number;
  pageSize?: number;
};

// Get all clients
export async function getClients({
  search,
  status,
  page = 1,
  pageSize = 20,
}: GetClientsParams) {
  const user = await requireUser();

  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(1, pageSize));

  const offset = (safePage - 1) * safePageSize;

  const conditions = [eq(clients.userId, user.id), isNull(clients.deletedAt)];
  if (status) conditions.push(eq(clients.status, status));
  if (search) conditions.push(ilike(clients.name, `%${search}%`));

  try {
    const [rows, [{ value: total }]] = await Promise.all([
      db
        .select()
        .from(clients)
        .where(and(...conditions))
        .orderBy(desc(clients.createdAt))
        .limit(safePageSize)
        .offset(offset),
      db
        .select({ value: count() })
        .from(clients)
        .where(and(...conditions)),
    ]);

    return {
      clients: rows,
      total,
      page: safePage,
      pageSize: safePageSize,
      totalPages: Math.ceil(total / safePageSize),
    };
  } catch (error) {
    logError("getClients", error);
    throw new AppError("FETCH_FAILED", "could not load clients");
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
