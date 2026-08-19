import { requireUser } from "@/lib/current-user";
import { AppError, logError } from "@/lib/errors";
import { projectClientIdSchema } from "./schema";
import { db } from "@/src/db";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { projects } from "@/src/db/schema/projects";
import type { ProjectRow } from "@/src/db/schema/projects";
import { clients } from "@/src/db/schema/clients";
import { milestones } from "@/src/db/schema/milestones";

export type ProjectListItem = {
  id: string;
  title: string;
  status: "not_started" | "in_progress" | "on_hold" | "completed";
  budget: string;
  deadline: string | null;
  createdAt: Date;
  clientId: string;
  clientName: string | null;
  totalMilestones: number;
  completedMilestones: number;
  progress: number; // 0–100
};

export async function getAllProjects(): Promise<ProjectListItem[]> {
  try {
    const user = await requireUser();

    const rows = await db
      .select({
        id: projects.id,
        title: projects.title,
        status: projects.status,
        budget: projects.budget,
        deadline: projects.deadline,
        createdAt: projects.createdAt,
        clientId: projects.clientId,
        clientName: clients.name,
        totalMilestones:
          sql<number>`cast(count(${milestones.id}) as int)`.mapWith(Number),
        completedMilestones:
          sql<number>`cast(count(case when ${milestones.status} = 'completed' then 1 end) as int)`.mapWith(
            Number,
          ),
      })
      .from(projects)
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .leftJoin(milestones, eq(milestones.projectId, projects.id))
      .where(and(eq(projects.userId, user.id), isNull(projects.deletedAt)))
      .groupBy(
        projects.id,
        projects.title,
        projects.status,
        projects.budget,
        projects.deadline,
        projects.createdAt,
        projects.clientId,
        clients.name,
      )
      .orderBy(desc(projects.createdAt));

    // milestones calculation
    return rows.map((row) => {
      const total = row.totalMilestones ?? 0;
      const completed = row.completedMilestones ?? 0;
      const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

      return {
        ...row,
        totalMilestones: total,
        completedMilestones: completed,
        progress,
      };
    });
  } catch (error) {
    logError("getAllProjects", error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("FETCH_FAILED", "Could not load projects.");
  }
}

export async function getProjectsByClientId(
  clientId: string,
): Promise<ProjectListItem[]> {
  try {
    const parsedClientId = projectClientIdSchema.safeParse(clientId);
    if (!parsedClientId.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid client ID.");
    }

    const user = await requireUser();

    const rows = await db
      .select({
        id: projects.id,
        title: projects.title,
        status: projects.status,
        budget: projects.budget,
        deadline: projects.deadline,
        createdAt: projects.createdAt,
        clientId: projects.clientId,
        clientName: clients.name,
        totalMilestones: sql<number>`count(${milestones.id})`.mapWith(Number),
        completedMilestones: sql<number>`
          count(${milestones.id}) filter (where ${milestones.status} = 'completed')
        `.mapWith(Number),
      })
      .from(projects)
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .leftJoin(milestones, eq(milestones.projectId, projects.id))
      .where(
        and(
          eq(projects.clientId, parsedClientId.data),
          eq(projects.userId, user.id),
          isNull(projects.deletedAt),
        ),
      )
      .groupBy(
        projects.id,
        projects.title,
        projects.status,
        projects.budget,
        projects.deadline,
        projects.createdAt,
        projects.clientId,
        clients.name,
      )
      .orderBy(desc(projects.createdAt));

    // Calculate progress
    return rows.map((row) => ({
      ...row,
      clientName: row.clientName ?? null,
      progress:
        row.totalMilestones === 0
          ? 0
          : Math.round((row.completedMilestones / row.totalMilestones) * 100),
    }));
  } catch (error) {
    logError("getProjectsByClientId", error);

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("FETCH_FAILED", "Could not load projects.");
  }
}
