import { AppError } from "./errors";
import { createClient } from "./supabase/server";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new AppError("UNAUTHENTICATED", "You must logged in.");
  return user;
}
