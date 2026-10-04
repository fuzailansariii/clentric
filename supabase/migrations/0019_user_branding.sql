ALTER TABLE "users" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "logo_file_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "logo_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_brand_color_format" CHECK ("users"."brand_color" is null or "users"."brand_color" ~ '^#[0-9a-f]{6}$');--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_testimonial_length" CHECK (char_length("users"."testimonial_quote") <= 300 and char_length("users"."testimonial_author") <= 80);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_logo_pair" CHECK (("users"."logo_url" is null) = ("users"."logo_file_id" is null));