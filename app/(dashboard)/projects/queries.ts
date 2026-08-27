import { requireUser } from "@/lib/current-user";
import { AppError, logError } from "@/lib/errors";
import {
  projectClientIdSchema,
  projectIdSchema,
  projectSearchParamsSchema,
} from "./schema";
import { db } from "@/src/db";
import { and, count, desc, eq, ilike, isNull, sql } from "drizzle-orm";
import { projects } from "@/src/db/schema/projects";
import { clients } from "@/src/db/schema/clients";
import { milestones } from "@/src/db/schema/milestones";

export type ProjectListItem = {
  id: string;
  title: string;
  description: string | null;
  status: "not_started" | "in_progress" | "on_hold" | "completed";
  budget: string;
  deadline: string | null;
  createdAt: Date;
  updatedAt: Date;
  clientId: string;
  clientName: string | null;
  totalMilestones: number;
  completedMilestones: number;
  progress: number; // 0–100
};

export async function getAllProjects(rawParam: unknown) {
  try {
    const user = await requireUser();
    const { page, pageSize, search, status } = projectSearchParamsSchema.parse(
      rawParam ?? {},
    );

    const offset = (page - 1) * pageSize;

    const conditions = [
      eq(projects.userId, user.id),
      isNull(projects.deletedAt),
    ];

    if (status) conditions.push(eq(projects.status, status));
    if (search) conditions.push(ilike(projects.title, `%${search}%`));

    const [rows, [{ value: total }]] = await Promise.all([
      db
        .select({
          id: projects.id,
          title: projects.title,
          description: projects.description,
          status: projects.status,
          budget: projects.budget,
          deadline: projects.deadline,
          createdAt: projects.createdAt,
          updatedAt: projects.updatedAt,
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
        .where(and(...conditions))
        .groupBy(
          projects.id,
          projects.title,
          projects.description,
          projects.status,
          projects.budget,
          projects.deadline,
          projects.createdAt,
          projects.updatedAt,
          projects.clientId,
          clients.name,
        )
        .orderBy(desc(projects.createdAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ value: count() })
        .from(projects)
        .where(and(...conditions)),
    ]);

    const items = rows.map((row) => {
      const total = row.totalMilestones ?? 0;
      const completed = row.completedMilestones ?? 0;
      return {
        ...row,
        progress: total === 0 ? 0 : Math.round((completed / total) * 100),
      };
    });

    return {
      projects: items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  } catch (error) {
    logError("getAllProjects", error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("FETCH_FAILED", "Could not load projects.");
  }
}

export async function getProjectById(
  projectId: string,
): Promise<ProjectListItem | null> {
  try {
    const parsed = projectIdSchema.safeParse(projectId);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid project ID.");
    }

    const user = await requireUser();

    const [row] = await db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        status: projects.status,
        budget: projects.budget,
        deadline: projects.deadline,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
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
      .where(
        and(
          eq(projects.id, parsed.data),
          eq(projects.userId, user.id),
          isNull(projects.deletedAt),
        ),
      )
      .groupBy(
        projects.id,
        projects.title,
        projects.description,
        projects.status,
        projects.budget,
        projects.deadline,
        projects.createdAt,
        projects.updatedAt,
        projects.clientId,
        clients.name,
      )
      .limit(1);

    if (!row) return null;

    const total = row.totalMilestones ?? 0;
    const completed = row.completedMilestones ?? 0;

    return {
      ...row,
      progress: total === 0 ? 0 : Math.round((completed / total) * 100),
    };
  } catch (error) {
    logError("getProjectById", error);
    if (error instanceof AppError) throw error;
    throw new AppError("FETCH_FAILED", "Could not load project.");
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
        description: projects.description,
        status: projects.status,
        budget: projects.budget,
        deadline: projects.deadline,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
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
        projects.description,
        projects.status,
        projects.budget,
        projects.deadline,
        projects.createdAt,
        projects.updatedAt,
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

export async function getMilestonesByProjectId(projectId: string) {
  try {
    const parsed = projectIdSchema.safeParse(projectId);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid project ID.");
    }

    const user = await requireUser();

    const rows = await db
      .select({
        id: milestones.id,
        title: milestones.title,
        status: milestones.status,
        dueDate: milestones.dueDate,
        createdAt: milestones.createdAt,
      })
      .from(milestones)
      .innerJoin(projects, eq(milestones.projectId, projects.id))
      .where(
        and(
          eq(milestones.projectId, parsed.data),
          eq(projects.userId, user.id),
          isNull(projects.deletedAt),
        ),
      )
      .orderBy(milestones.createdAt);

    return rows;
  } catch (error) {
    logError("getMilestonesByProjectId", error);
    if (error instanceof AppError) throw error;
    throw new AppError("FETCH_FAILED", "Could not load milestones.");
  }
}
