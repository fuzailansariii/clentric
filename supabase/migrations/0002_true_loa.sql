CREATE TYPE "public"."waitlist_source" AS ENUM('x', 'reddit', 'direct', 'other');--> statement-breakpoint
CREATE TABLE "waitlist_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"source" "waitlist_source" DEFAULT 'direct',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unsubscribed_at" timestamp with time zone,
	CONSTRAINT "waitlist_emails_email_unique" UNIQUE("email")
);
