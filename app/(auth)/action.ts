"use server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { logError } from "@/lib/errors";

const destinationSchema = z.enum(["/login", "/"]);

/**
 * Signs this device out, then opens `destination`. On failure nothing moves:
 * redirecting would land a still-signed-in user on /login.
 */
export async function logoutAction(
  destination: unknown,
): Promise<ActionResult> {
  const parsed = destinationSchema.safeParse(destination);
  const to = parsed.success ? parsed.data : "/login";

  try {
    const supabase = await createClient();
    // This device only. signOut() with no options defaults to "global" in
    // supabase-js 2.x, which would sign the user out everywhere.
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw error;
  } catch (error) {
    logError("logoutAction", error);
    return {
      success: false,
      error: "Could not log out. Check your connection and try again.",
    };
  }

  redirect(to);
}
