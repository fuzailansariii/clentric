"use server";
import { requireUser } from "@/lib/current-user";
import { clientIdSchema, clientSchema } from "./schema";
import { AppError, logError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { db } from "@/src/db";
import { clients } from "@/src/db/schema/clients";
import { and, eq, isNull } from "drizzle-orm";
import { normalize } from "@/lib/normalizeOptionalFields";

type ActionResult<T = void> =
  | (T extends void ? { success: true } : { success: true; data: T })
  | { success: false; error: string };

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
    revalidatePath("/clients");
    revalidatePath(`/clients/${clientId}`);
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

    const deleted = await db
      .update(clients)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(clients.id, parsedClientId.data),
          eq(clients.userId, user.id),
          isNull(clients.deletedAt),
        ),
      )
      .returning({ id: clients.id });

    if (deleted.length === 0) {
      throw new AppError("NOT_FOUND", "Client not found.");
    }

    revalidatePath("/clients");
    revalidatePath(`/clients/${clientId}`);
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
