"use server";

import { logError } from "./errors";

export async function logClientError(
  context: string,
  message: string,
  digest?: string,
) {
  logError(context, { message, digest });
}
