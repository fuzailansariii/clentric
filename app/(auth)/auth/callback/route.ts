import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Where Supabase sends the browser back after Google sign-in. An optional
 * `next` path says where to land afterwards (default /dashboard).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  // Code missing or exchange failed — send them to login with an error flag
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
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
