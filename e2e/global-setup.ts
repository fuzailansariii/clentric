import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createServerClient } from "@supabase/ssr";
import {
  adminClient,
  AUTH_FILE,
  deleteTestData,
  E2E_EMAIL,
  ensureTestUser,
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
  const admin = adminClient();
  await ensureTestUser(admin, E2E_EMAIL, "E2E Tester");

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
