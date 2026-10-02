-- Drop any duplicate events (keeping the oldest) so the unique index can build.
DELETE FROM "activity_logs" a
USING "activity_logs" b
WHERE a."action" <> 'invoice.reminder_sent'
  AND a."user_id" = b."user_id"
  AND a."action" = b."action"
  AND a."entity_id" = b."entity_id"
  AND (a."created_at", a."id") > (b."created_at", b."id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_activity_logs_event" ON "activity_logs" USING btree ("user_id","action","entity_id") WHERE "activity_logs"."action" <> 'invoice.reminder_sent';
