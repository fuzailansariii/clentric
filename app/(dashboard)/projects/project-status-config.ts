import type { z } from "zod";
import { projectStatusEnum } from "./schema";

export type ProjectStatus = z.infer<typeof projectStatusEnum>;
