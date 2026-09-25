"use server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function logoutAction() {
  const supabase = await createClient();
  // This device only. signOut() with no options defaults to "global" in
  // supabase-js 2.x, which would sign the user out everywhere.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}
