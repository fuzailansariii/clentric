import { requireUser } from "@/lib/current-user";
import { AppError, logError } from "@/lib/errors";
import { projectClientIdSchema } from "./schema";
import { db } from "@/src/db";
import { projects } from "@/src/db/schema/projects";
import { and, desc, eq, isNull } from "drizzle-orm";

export async function getProjectsByClientId(clientId: string) {
  try {
    const parsedClientId = projectClientIdSchema.safeParse(clientId);
    if (!parsedClientId.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid client ID.");
    }
    const user = await requireUser();

    const projectRows = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.clientId, parsedClientId.data),
          eq(projects.userId, user.id),
          isNull(projects.deletedAt),
        ),
      )
      .orderBy(desc(projects.createdAt));
    return projectRows;
  } catch (error) {
    logError("getProjectsByClientId", error);

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("FETCH_FAILED", "Could not load projects.");
  }
}
