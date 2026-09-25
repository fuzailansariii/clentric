"use server";
import { requireUser } from "@/lib/current-user";
import { clientIdSchema, clientSchema } from "./schema";
import { AppError, logError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { db } from "@/src/db";
import { clients } from "@/src/db/schema/clients";
import { projects } from "@/src/db/schema/projects";
import { invoices } from "@/src/db/schema/invoices";
import { proposals } from "@/src/db/schema/proposals";
import {
  and,
  count,
  eq,
  gt,
  inArray,
  isNull,
  ne,
  notExists,
  or,
  sql,
} from "drizzle-orm";
import { normalize } from "@/lib/normalizeOptionalFields";
import { ActionResult } from "@/lib/action-result";


function revalidateClientEverywhere() {
  revalidatePath("/clients", "layout");
  revalidatePath("/projects", "layout");
  revalidatePath("/invoices", "layout");
  revalidatePath("/proposals", "layout");
}

// create client
export async function createClientAction(
  input: unknown,
): Promise<ActionResult<{ clientId: string }>> {
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const user = await requireUser();
    const [created] = await db
      .insert(clients)
      .values({ ...normalize(parsed.data), userId: user.id })
      .returning({ id: clients.id });

    if (!created) {
      throw new AppError("INSERT_FAILED", "Client was not created.");
    }
    revalidatePath("/clients");

    return { success: true, data: { clientId: created.id } };
  } catch (err) {
    logError("createClientAction", err);
    return {
      success: false,
      error: "Could not create client. Please try again.",
    };
  }
}

// update client
export async function updateClientAction(
  clientId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    // clientId validation
    const parsedInput = clientSchema.partial().safeParse(input);
    if (!parsedInput.success) {
      return { success: false, error: parsedInput.error.issues[0].message };
    }
    const parsedClientId = clientIdSchema.safeParse(clientId);
    if (!parsedClientId.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid client ID.");
    }

    // if there is no change in update
    const normalized = normalize(parsedInput.data);
    const hasChange = Object.values(normalized).some(
      (value) => value !== undefined,
    );
    if (!hasChange) {
      return { success: false, error: "No change to save" };
    }

    // get user
    const user = await requireUser();

    // DB call
    const updatedClient = await db
      .update(clients)
      .set({ ...normalized, updatedAt: new Date() })
      .where(
        and(
          eq(clients.id, parsedClientId.data),
          eq(clients.userId, user.id),
          isNull(clients.deletedAt),
        ),
      )
      .returning({ id: clients.id });

    // failed to update
    if (updatedClient.length === 0) {
      throw new AppError("NOT_FOUND", "Client not found.");
    }
    revalidateClientEverywhere();
    return { success: true };
  } catch (error) {
    logError("updateClientAction", error);
    return {
      success: false,
      error:
        error instanceof AppError
          ? error.message
          : "Could not update client. Please try again.",
    };
  }
}

// delete client
export async function deleteClientAction(
  clientId: string,
): Promise<ActionResult> {
  try {
    const parsedClientId = clientIdSchema.safeParse(clientId);
    if (!parsedClientId.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid client ID.");
    }

    const user = await requireUser();
    const id = parsedClientId.data;

    // Work that would be stranded without its client. Finished work
    // (completed projects, paid invoices, answered or expired proposals)
    // doesn't block. Compared against the id parameter rather than
    // correlated to clients.id, so no column name can resolve ambiguously.
    const openProjects = and(
      eq(projects.userId, user.id),
      eq(projects.clientId, id),
      isNull(projects.deletedAt),
      ne(projects.status, "completed"),
    );
    const openInvoices = and(
      eq(invoices.userId, user.id),
      eq(invoices.clientId, id),
      isNull(invoices.deletedAt),
      ne(invoices.status, "paid"),
    );
    const openProposals = and(
      eq(proposals.userId, user.id),
      eq(proposals.clientId, id),
      isNull(proposals.deletedAt),
      or(
        eq(proposals.status, "draft"),
        and(
          inArray(proposals.status, ["sent", "viewed"]),
          or(isNull(proposals.expiresAt), gt(proposals.expiresAt, sql`now()`)),
        ),
      ),
    );

    // The open-work check lives in the write's own WHERE, so work added a
    // moment ago in another tab still blocks the delete.
    const [deleted] = await db
      .update(clients)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(clients.id, id),
          eq(clients.userId, user.id),
          isNull(clients.deletedAt),
          notExists(
            db.select({ one: sql`1` }).from(projects).where(openProjects),
          ),
          notExists(
            db.select({ one: sql`1` }).from(invoices).where(openInvoices),
          ),
          notExists(
            db.select({ one: sql`1` }).from(proposals).where(openProposals),
          ),
        ),
      )
      .returning({ id: clients.id });

    if (!deleted) {
      // Refused: say what's still open, or that the client is gone.
      const [projectRows, invoiceRows, proposalRows, clientRows] =
        await Promise.all([
          db.select({ n: count() }).from(projects).where(openProjects),
          db.select({ n: count() }).from(invoices).where(openInvoices),
          db.select({ n: count() }).from(proposals).where(openProposals),
          db
            .select({ n: count() })
            .from(clients)
            .where(
              and(
                eq(clients.id, id),
                eq(clients.userId, user.id),
                isNull(clients.deletedAt),
              ),
            ),
        ]);

      if ((clientRows[0]?.n ?? 0) === 0) {
        throw new AppError("NOT_FOUND", "Client not found.");
      }

      const plural = (n: number, one: string, many: string) =>
        `${n} ${n === 1 ? one : many}`;
      const open = [
        [projectRows[0]?.n ?? 0, "open project", "open projects"],
        [invoiceRows[0]?.n ?? 0, "unpaid invoice", "unpaid invoices"],
        [proposalRows[0]?.n ?? 0, "open proposal", "open proposals"],
      ] as const;
      const parts = open
        .filter(([n]) => n > 0)
        .map(([n, one, many]) => plural(n, one, many));

      throw new AppError(
        "HAS_OPEN_WORK",
        `This client still has ${parts.join(", ")}. Finish or delete them first.`,
      );
    }

    revalidateClientEverywhere();
    return { success: true };
  } catch (error) {
    logError("deleteClientAction", error);
    return {
      success: false,
      error:
        error instanceof AppError
          ? error.message
          : "Could not delete client. Please try again.",
    };
  }
}
