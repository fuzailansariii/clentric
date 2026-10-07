CREATE TABLE "beta_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "beta_invites_email_unique" UNIQUE("email"),
	CONSTRAINT "beta_invites_email_lowercase" CHECK ("beta_invites"."email" = lower("beta_invites"."email"))
);
--> statement-breakpoint
-- Server-only: RLS on, no policies.
ALTER TABLE "beta_invites" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- Supabase "Before User Created" hook (Auth > Hooks). Runs for every sign-up path,
-- so the invite list can't be skipped by calling the Auth API directly.
CREATE OR REPLACE FUNCTION public.hook_beta_invite_only(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.beta_invites
    WHERE email = lower(event->'user'->>'email')
  ) THEN
    RETURN '{}'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message', 'Clentric is invite-only during the beta.'
    )
  );
END;
$$;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.hook_beta_invite_only(jsonb) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.hook_beta_invite_only(jsonb) TO supabase_auth_admin;
