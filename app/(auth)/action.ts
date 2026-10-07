"use server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

async function signOutThisDevice() {
  const supabase = await createClient();
  // This device only. signOut() with no options defaults to "global" in
  // supabase-js 2.x, which would sign the user out everywhere.
  await supabase.auth.signOut({ scope: "local" });
}

export async function logoutAction() {
  await signOutThisDevice();
  redirect("/login");
}

// From the landing page: stay on it, now showing Log in / Sign up.
export async function logoutToHomeAction() {
  await signOutThisDevice();
  redirect("/");
}
