"use server";
import { AppError, logError } from "@/lib/errors";
import {
  editableProjectsSchema,
  projectIdSchema,
  projectSchema,
} from "./schema";
import { requireWriter } from "@/lib/write-limit";
import { db } from "@/src/db";
import { clients } from "@/src/db/schema/clients";
import { and, eq, inArray, isNull, notInArray, sql } from "drizzle-orm";
import { projects } from "@/src/db/schema/projects";
import { milestones } from "@/src/db/schema/milestones";
import { normalize } from "@/lib/normalizeOptionalFields";
import { revalidatePath } from "next/cache";
import { ActionResult } from "@/lib/action-result";
import { logActivity } from "@/lib/activity";
import { assertWithinPlan, planLimitsFor } from "@/lib/plan-limits";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type MilestoneRow = {
  id?: string;
  title: string;
  dueDate: string;
  amount: string;
};

function ownedProjectIds(tx: Tx, userId: string) {
  return tx
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.userId, userId), isNull(projects.deletedAt)));
}

/**
 * Makes the project's milestones match the form: removed rows go, saved rows
 * are updated in place (keeping done and invoiced), new rows are added.
 */
async function syncMilestones(
  tx: Tx,
  userId: string,
  projectId: string,
  rows: MilestoneRow[],
) {
  const owned = and(
    eq(milestones.projectId, projectId),
    inArray(milestones.projectId, ownedProjectIds(tx, userId)),
  );
  const keptIds = rows.flatMap((row) => (row.id ? [row.id] : []));

  await tx
    .delete(milestones)
    .where(
      keptIds.length ? and(owned, notInArray(milestones.id, keptIds)) : owned,
    );

  const now = new Date();
  for (const [index, row] of rows.entries()) {
    if (!row.id) continue;
    await tx
      .update(milestones)
      .set({
        title: row.title,
        dueDate: row.dueDate || null,
        amount: row.amount || null,
        sortOrder: index,
        updatedAt: now,
      })
      .where(and(eq(milestones.id, row.id), owned));
  }

  const added = rows.flatMap((row, index) =>
    row.id
      ? []
      : [
          {
            projectId,
            title: row.title,
            dueDate: row.dueDate || null,
            amount: row.amount || null,
            sortOrder: index,
          },
        ],
  );
  if (added.length) await tx.insert(milestones).values(added);
}

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

    const user = await requireWriter();
    const {
      clientId,
      milestones: milestoneRows = [],
      ...fields
    } = parsedInput.data;
    const data = normalize(fields);
    const limits = await planLimitsFor(user.id);

    // INSERT ... SELECT: the row is only produced when the client exists,
    // belongs to this user and isn't deleted, so the ownership check lives
    // in the write itself — no transaction, no check-then-insert race.
    // Drizzle requires every column, in table order.
    const created = await db.transaction(async (tx) => {
      await assertWithinPlan(tx, user.id, limits, ["projects"]);
      const [row] = await tx
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
              deadline: sql<string | null>`${data.deadline ?? null}::date`.as(
                "deadline",
              ),
              status: sql<
                typeof data.status
              >`${data.status}::project_status_enum`.as("status"),
              createdAt: sql<Date>`now()`.as("created_at"),
              updatedAt: sql<Date>`now()`.as("updated_at"),
              deletedAt: sql<Date | null>`null::timestamptz`.as("deleted_at"),
              pricing: sql<
                typeof data.pricing
              >`${data.pricing}::project_pricing`.as("pricing"),
              startDate: sql<string | null>`${data.startDate ?? null}::date`.as(
                "start_date",
              ),
              billing: sql<
                "per_milestone" | "end"
              >`${data.billing ?? "per_milestone"}::project_billing`.as(
                "billing",
              ),
              completedAt: (data.status === "completed"
                ? sql<Date | null>`now()`
                : sql<Date | null>`null::timestamptz`
              ).as("completed_at"),
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

      if (!row) {
        throw new AppError("NOT_FOUND", "Client not found");
      }
      await syncMilestones(tx, user.id, row.id, milestoneRows);
      return row;
    });

    revalidatePath(`/clients/${clientId}`);
    revalidatePath(`/projects`);
    revalidatePath("/dashboard");
    logActivity({
      userId: user.id,
      action: "project.created",
      entityId: created.id,
    });

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

    const { milestones: milestoneRows, ...fields } = parsedInput.data;
    const normalized = normalize(fields);
    const hasChange =
      milestoneRows !== undefined ||
      Object.values(normalized).some((value) => value !== undefined);

    if (!hasChange) {
      return {
        success: false,
        error: "No change to save",
      };
    }

    const user = await requireWriter();

    // Completing stamps the delivered date once; any other status clears it.
    const completedAt =
      normalized.status === undefined
        ? undefined
        : normalized.status === "completed"
          ? sql`coalesce(${projects.completedAt}, now())`
          : null;

    const updated = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(projects)
        .set({ ...normalized, completedAt, updatedAt: new Date() })
        .where(
          and(
            eq(projects.id, parsedProjectId.data),
            eq(projects.userId, user.id),
            isNull(projects.deletedAt),
          ),
        )
        .returning({ id: projects.id, clientId: projects.clientId });

      if (!row) {
        throw new AppError("NOT_FOUND", "Project not found.");
      }
      if (milestoneRows) {
        await syncMilestones(tx, user.id, row.id, milestoneRows);
      }
      return row;
    });

    revalidatePath(`/clients/${updated.clientId}`);
    revalidatePath(`/projects`);
    revalidatePath(`/projects/${updated.id}`);
    revalidatePath("/dashboard");
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

    const user = await requireWriter();

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
    revalidatePath("/dashboard");
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
