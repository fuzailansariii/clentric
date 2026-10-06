import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Where Supabase sends the browser back after Google sign-in. An optional
 * `next` path says where to land afterwards (default /dashboard).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) return redirectTo(next);
  }

  // A new Google account refused by the beta invite hook.
  if (searchParams.get("error_description")?.includes("invite-only")) {
    return redirectTo("/register?error=invite_only");
  }

  // Code missing or exchange failed — send them to login with an error flag
  return redirectTo("/login?error=auth_failed");
}

// Relative Location: the browser stays on the domain it came from. request.url's
// origin can be the host's internal address (e.g. localhost:3000) behind a proxy.
function redirectTo(path: string) {
  return new NextResponse(null, { status: 307, headers: { Location: path } });
}

/**
 * Only same-site paths. "//evil.com" and "/\evil.com" are protocol-relative
 * in browsers, so a bare "starts with /" check isn't enough.
 */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || /^\/[/\\]/.test(value)) {
    return "/dashboard";
  }
  return value;
}
