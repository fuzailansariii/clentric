"use server";
import { AppError, logError } from "@/lib/errors";
import {
  editableProjectsSchema,
  projectIdSchema,
  projectSchema,
} from "./schema";
import { requireUser } from "@/lib/current-user";
import { db } from "@/src/db";
import { clients } from "@/src/db/schema/clients";
import { and, eq, isNull, sql } from "drizzle-orm";
import { projects } from "@/src/db/schema/projects";
import { normalize } from "@/lib/normalizeOptionalFields";
import { revalidatePath } from "next/cache";
import { ActionResult } from "@/lib/action-result";

// PROJECT ACTIONS ---------------

// Create Project Action
export async function createProjectAction(
  input: unknown,
): Promise<ActionResult<{ projectId: string }>> {
  try {
    const parsedInput = projectSchema.safeParse(input);
    if (!parsedInput.success) {
      return {
        success: false,
        error: parsedInput.error.issues[0].message,
      };
    }

    const user = await requireUser();
    const { clientId } = parsedInput.data;
    const data = normalize(parsedInput.data);

    // INSERT ... SELECT: the row is only produced when the client exists,
    // belongs to this user and isn't deleted, so the ownership check lives
    // in the write itself — no transaction, no check-then-insert race.
    // Drizzle requires every column, in table order.
    const [created] = await db
      .insert(projects)
      .select(
        db
          .select({
            id: sql<string>`gen_random_uuid()`.as("id"),
            userId: sql<string>`${user.id}::uuid`.as("user_id"),
            clientId: clients.id,
            title: sql<string>`${data.title}::text`.as("title"),
            description: sql<
              string | null
            >`${data.description ?? null}::text`.as("description"),
            budget: sql<string>`${data.budget}::numeric`.as("budget"),
            currency: sql<string>`'USD'::text`.as("currency"),
            proposalId: sql<string | null>`null::uuid`.as("proposal_id"),
            hourlyRate: sql<
              string | null
            >`${data.hourlyRate ?? null}::numeric`.as("hourly_rate"),
            deadline: sql<
              string | null
            >`${data.deadline ?? null}::date`.as("deadline"),
            status: sql<
              typeof data.status
            >`${data.status}::project_status_enum`.as("status"),
            createdAt: sql<Date>`now()`.as("created_at"),
            updatedAt: sql<Date>`now()`.as("updated_at"),
            deletedAt: sql<Date | null>`null::timestamptz`.as("deleted_at"),
          })
          .from(clients)
          .where(
            and(
              eq(clients.id, clientId),
              eq(clients.userId, user.id),
              isNull(clients.deletedAt),
            ),
          ),
      )
      .returning({ id: projects.id });

    if (!created) {
      throw new AppError("NOT_FOUND", "Client not found");
    }

    revalidatePath(`/clients/${clientId}`);
    revalidatePath(`/projects`);

    return {
      success: true,
      data: {
        projectId: created.id,
      },
    };
  } catch (error) {
    logError("createProjectAction", error);
    return {
      success: false,
      error:
        error instanceof AppError
          ? error.message
          : "Could not create project. Please try again.",
    };
  }
}

// Update Project Action
export async function updateProjectAction(
  projectId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const parsedProjectId = projectIdSchema.safeParse(projectId);

    if (!parsedProjectId.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid project ID.");
    }

    // Reject non-object input outright instead of silently coercing it.
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      return {
        success: false,
        error: "Invalid update payload.",
      };
    }

    // clientId is immutable after creation — drop it before validation so it's
    // ignored rather than accepted and applied.
    const updatableInput: Record<string, unknown> = { ...input };
    delete updatableInput.clientId;

    const parsedInput = editableProjectsSchema.safeParse(updatableInput);

    if (!parsedInput.success) {
      return {
        success: false,
        error: parsedInput.error.issues[0].message,
      };
    }

    const normalized = normalize(parsedInput.data);
    const hasChange = Object.values(normalized).some(
      (value) => value !== undefined,
    );

    if (!hasChange) {
      return {
        success: false,
        error: "No change to save",
      };
    }

    const user = await requireUser();

    const [updated] = await db
      .update(projects)
      .set({ ...normalized, updatedAt: new Date() })
      .where(
        and(
          eq(projects.id, parsedProjectId.data),
          eq(projects.userId, user.id),
          isNull(projects.deletedAt),
        ),
      )
      .returning({ id: projects.id, clientId: projects.clientId });

    if (!updated) {
      throw new AppError("NOT_FOUND", "Project not found.");
    }

    revalidatePath(`/clients/${updated.clientId}`);
    revalidatePath(`/projects`);
    revalidatePath(`/projects/${updated.id}`);
    return { success: true };
  } catch (error) {
    logError("updateProjectAction", error);
    return {
      success: false,
      error:
        error instanceof AppError
          ? error.message
          : "Could not update project. Please try again.",
    };
  }
}

// Delete Project Action
export async function deleteProjectAction(
  projectId: string,
): Promise<ActionResult> {
  try {
    const parsedProjectId = projectIdSchema.safeParse(projectId);

    if (!parsedProjectId.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid project ID.");
    }

    const user = await requireUser();

    const [deleted] = await db
      .update(projects)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(projects.id, parsedProjectId.data),
          eq(projects.userId, user.id),
          isNull(projects.deletedAt),
        ),
      )
      .returning({
        id: projects.id,
        clientId: projects.clientId,
      });

    if (!deleted) {
      throw new AppError("NOT_FOUND", "Project not found.");
    }

    revalidatePath(`/clients/${deleted.clientId}`);
    revalidatePath(`/projects`);
    revalidatePath(`/projects/${deleted.id}`);
    return { success: true };
  } catch (error) {
    logError("deleteProjectAction", error);
    return {
      success: false,
      error:
        error instanceof AppError
          ? error.message
          : "Could not delete project. Please try again.",
    };
  }
}
