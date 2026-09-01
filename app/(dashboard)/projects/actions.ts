"use server";
import { AppError, logError } from "@/lib/errors";
import { projectIdSchema, projectSchema } from "./schema";
import { requireUser } from "@/lib/current-user";
import { db } from "@/src/db";
import { clients } from "@/src/db/schema/clients";
import { and, eq, isNull } from "drizzle-orm";
import { projects } from "@/src/db/schema/projects";
import { normalize } from "@/lib/normalizeOptionalFields";
import { revalidatePath } from "next/cache";
import { ActionResult } from "@/lib/action-result";

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

    // check if the client already exist
    const user = await requireUser();
    const { clientId } = parsedInput.data;

    const created = await db.transaction(async (tx) => {
      const [client] = await tx
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(
            eq(clients.id, clientId),
            eq(clients.userId, user.id),
            isNull(clients.deletedAt),
          ),
        )
        .limit(1)
        .for("update");

      if (!client) {
        throw new AppError("NOT_FOUND", "Client not found");
      }

      const [row] = await tx
        .insert(projects)
        .values({
          ...normalize(parsedInput.data),
          userId: user.id,
        })
        .returning({ id: projects.id });

      return row;
    });

    if (!created) {
      throw new AppError("INSERT_FAILED", "Project was not created.");
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

    // clientId is immutable after creation — strip it before validation
    // so it's silently ignored rather than accepted and applied.
    const { clientId: _clientId, ...updatableInput } = input as Record<
      string,
      unknown
    >;

    const parsedInput = projectSchema
      .omit({ clientId: true })
      .partial()
      .safeParse(updatableInput);

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
