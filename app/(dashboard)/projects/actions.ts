import { AppError, logError } from "@/lib/errors";
import {
  projectClientIdSchema,
  projectIdSchema,
  projectSchema,
} from "./schema";
import { requireUser } from "@/lib/current-user";
import { db } from "@/src/db";
import { clients } from "@/src/db/schema/clients";
import { and, eq, isNull } from "drizzle-orm";
import { projects } from "@/src/db/schema/projects";
import { normalize } from "@/lib/normalizeOptionalFields";
import { revalidatePath } from "next/cache";

type ActionResult<T = void> =
  | (T extends void ? { success: true } : { success: true; data: T })
  | { success: false; error: string };

// Create Project Action
export async function createProjectAction(
  clientId: string,
  input: unknown,
): Promise<ActionResult<{ projectId: string }>> {
  try {
    const parsedClientId = projectClientIdSchema.safeParse(clientId);
    if (!parsedClientId.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid Client ID");
    }

    const parsedInput = projectSchema.safeParse(input);
    if (!parsedInput.success) {
      return {
        success: false,
        error: parsedInput.error.issues[0].message,
      };
    }

    // check if the client already exist
    const user = await requireUser();
    const [client] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(
        and(
          eq(clients.id, parsedClientId.data),
          eq(clients.userId, user.id),
          isNull(clients.deletedAt),
        ),
      )
      .limit(1);

    if (!client) {
      throw new AppError("NOT_FOUND", "Client not found");
    }

    // create project.
    const [created] = await db
      .insert(projects)
      .values({
        ...normalize(parsedInput.data),
        userId: user.id,
        clientId: parsedClientId.data,
      })
      .returning({ id: projects.id });

    if (!created) {
      throw new AppError("INSERT_FAILED", "Project was not created.");
    }

    revalidatePath(`/clients/${parsedClientId.data}`);

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

    const parsedInput = projectSchema.partial().safeParse(input);

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

    // update project
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
          eq(projects.id, projectId),
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
