import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import {
  AUTH_FILE,
  deleteTestData,
  E2E_EMAIL,
  requireEnv,
} from "./support/env";

// Signs the test account in with an admin-minted code; no email is sent.
export default async function globalSetup() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await rm(AUTH_FILE, { force: true });
    console.warn(
      "SUPABASE_SERVICE_ROLE_KEY not set: skipping signed-in tests.",
    );
    return;
  }

  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const admin = createClient(url, requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const created = await admin.auth.admin.createUser({
    email: E2E_EMAIL,
    email_confirm: true,
    user_metadata: { full_name: "E2E Tester" },
  });
  if (created.error && created.error.code !== "email_exists") {
    throw created.error;
  }

  const link = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: E2E_EMAIL,
  });
  if (link.error) throw link.error;

  const jar = new Map<string, string>();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) =>
        cookies.forEach(({ name, value }) => jar.set(name, value)),
    },
  });

  const verified = await supabase.auth.verifyOtp({
    email: E2E_EMAIL,
    token: link.data.properties.email_otp,
    type: "email",
  });
  if (verified.error || !verified.data.user) {
    throw verified.error ?? new Error("Test sign-in returned no user.");
  }

  // Start from a clean slate every run.
  await deleteTestData(verified.data.user.id);

  const { hostname } = new URL(
    process.env.E2E_BASE_URL ?? "http://localhost:3000",
  );
  await mkdir(dirname(AUTH_FILE), { recursive: true });
  await writeFile(
    AUTH_FILE,
    JSON.stringify({
      cookies: [...jar].map(([name, value]) => ({
        name,
        value,
        domain: hostname,
        path: "/",
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: "Lax",
      })),
      origins: [],
    }),
  );
}
