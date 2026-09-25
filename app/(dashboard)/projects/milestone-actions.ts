"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/current-user";
import { AppError, logError } from "@/lib/errors";
import { db } from "@/src/db";
import { milestones } from "@/src/db/schema/milestones";
import { projects } from "@/src/db/schema/projects";
import {
  milestoneIdSchema,
  milestoneSchema,
  milestoneStatusEnum,
  projectIdSchema,
  updateMilestoneSchema,
} from "./schema";

function ownedProjectIds(userId: string) {
  return db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.userId, userId), isNull(projects.deletedAt)));
}

function revalidateMilestonePaths(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/(dashboard)/clients/[id]", "page");
}

// Create Milestone Action
export async function createMilestoneAction(
  projectId: string,
  input: unknown,
): Promise<ActionResult<{ milestoneId: string }>> {
  try {
    const parsedProjectId = projectIdSchema.safeParse(projectId);
    if (!parsedProjectId.success) {
      return { success: false, error: "Invalid project ID." };
    }

    const parsed = milestoneSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const user = await requireUser();

    const { title } = parsed.data;
    const dueDate = parsed.data.dueDate || null;

    // INSERT ... SELECT: the row is only produced when the project exists,
    // belongs to this user and isn't deleted — no separate check-then-insert
    // race. Drizzle requires every column, in table order.
    const [created] = await db
      .insert(milestones)
      .select(
        db
          .select({
            id: sql<string>`gen_random_uuid()`.as("id"),
            projectId: projects.id,
            title: sql<string>`${title}::text`.as("title"),
            status: sql<"pending">`'pending'::milestone_status`.as("status"),
            dueDate: sql<string | null>`${dueDate}::date`.as("due_date"),
            // After the project's current last milestone, so a hand-added
            // one lands at the end of the list. Written with explicit table
            // aliases: Drizzle leaves column names unqualified in a
            // single-table select, which would make the subquery compare
            // the milestone's own project_id with its own id.
            sortOrder:
              sql<number>`(select coalesce(max(m.sort_order) + 1, 0) from milestones m where m.project_id = "projects"."id")`.as(
                "sort_order",
              ),
            createdAt: sql<Date>`now()`.as("created_at"),
            updatedAt: sql<Date>`now()`.as("updated_at"),
          })
          .from(projects)
          .where(
            and(
              eq(projects.id, parsedProjectId.data),
              eq(projects.userId, user.id),
              isNull(projects.deletedAt),
            ),
          ),
      )
      .returning({ id: milestones.id });

    if (!created) {
      throw new AppError("NOT_FOUND", "Project not found.");
    }

    revalidateMilestonePaths(parsedProjectId.data);

    return { success: true, data: { milestoneId: created.id } };
  } catch (error) {
    logError("createMilestoneAction", error);
    return {
      success: false,
      error:
        error instanceof AppError
          ? error.message
          : "Could not add milestone. Please try again.",
    };
  }
}

// Update Milestone Action (title and/or due date)
export async function updateMilestoneAction(
  milestoneId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const parsedId = milestoneIdSchema.safeParse(milestoneId);
    if (!parsedId.success) {
      return { success: false, error: "Invalid milestone ID." };
    }

    const parsed = updateMilestoneSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    // Only fields that were sent get written; "" clears the due date.
    const changes: { title?: string; dueDate?: string | null } = {};
    if (parsed.data.title !== undefined) changes.title = parsed.data.title;
    if (parsed.data.dueDate !== undefined) {
      changes.dueDate = parsed.data.dueDate || null;
    }

    if (Object.keys(changes).length === 0) {
      return { success: false, error: "No change to save." };
    }

    const user = await requireUser();

    const [updated] = await db
      .update(milestones)
      .set({ ...changes, updatedAt: new Date() })
      .where(
        and(
          eq(milestones.id, parsedId.data),
          inArray(milestones.projectId, ownedProjectIds(user.id)),
        ),
      )
      .returning({ projectId: milestones.projectId });

    if (!updated) {
      throw new AppError("NOT_FOUND", "Milestone not found.");
    }

    revalidateMilestonePaths(updated.projectId);

    return { success: true };
  } catch (error) {
    logError("updateMilestoneAction", error);
    return {
      success: false,
      error:
        error instanceof AppError
          ? error.message
          : "Could not update milestone. Please try again.",
    };
  }
}

// Complete / reopen Milestone Action
export async function setMilestoneStatusAction(
  milestoneId: string,
  status: unknown,
): Promise<ActionResult> {
  try {
    const parsedId = milestoneIdSchema.safeParse(milestoneId);
    if (!parsedId.success) {
      return { success: false, error: "Invalid milestone ID." };
    }

    const parsedStatus = milestoneStatusEnum.safeParse(status);
    if (!parsedStatus.success) {
      return { success: false, error: "Invalid milestone status." };
    }

    const user = await requireUser();

    const [updated] = await db
      .update(milestones)
      .set({ status: parsedStatus.data, updatedAt: new Date() })
      .where(
        and(
          eq(milestones.id, parsedId.data),
          inArray(milestones.projectId, ownedProjectIds(user.id)),
        ),
      )
      .returning({ projectId: milestones.projectId });

    if (!updated) {
      throw new AppError("NOT_FOUND", "Milestone not found.");
    }

    revalidateMilestonePaths(updated.projectId);

    return { success: true };
  } catch (error) {
    logError("setMilestoneStatusAction", error);
    return {
      success: false,
      error:
        error instanceof AppError
          ? error.message
          : "Could not update milestone. Please try again.",
    };
  }
}

// Delete Milestone Action — milestones have no deleted_at, so this is a hard
// delete; the confirm dialog in the UI is the safety net.
export async function deleteMilestoneAction(
  milestoneId: string,
): Promise<ActionResult> {
  try {
    const parsedId = milestoneIdSchema.safeParse(milestoneId);
    if (!parsedId.success) {
      return { success: false, error: "Invalid milestone ID." };
    }

    const user = await requireUser();

    const [deleted] = await db
      .delete(milestones)
      .where(
        and(
          eq(milestones.id, parsedId.data),
          inArray(milestones.projectId, ownedProjectIds(user.id)),
        ),
      )
      .returning({ projectId: milestones.projectId });

    if (!deleted) {
      throw new AppError("NOT_FOUND", "Milestone not found.");
    }

    revalidateMilestonePaths(deleted.projectId);

    return { success: true };
  } catch (error) {
    logError("deleteMilestoneAction", error);
    return {
      success: false,
      error:
        error instanceof AppError
          ? error.message
          : "Could not delete milestone. Please try again.",
    };
  }
}
