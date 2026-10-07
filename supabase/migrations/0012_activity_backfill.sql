-- Seeds the activity feed from existing timestamps; safe to re-run.
INSERT INTO "activity_logs" ("user_id", "action", "entity_type", "entity_id", "metadata", "created_at")
SELECT e.user_id, e.action, e.entity_type, e.entity_id, e.metadata, e.created_at
FROM (
  SELECT "user_id", 'client.created' AS action, 'client' AS entity_type, "id" AS entity_id, NULL::jsonb AS metadata, "created_at"
  FROM "clients"

  UNION ALL
  SELECT "user_id", 'invoice.created', 'invoice', "id", NULL, "created_at" FROM "invoices"
  UNION ALL
  SELECT "user_id", 'invoice.sent', 'invoice', "id", NULL, "sent_at" FROM "invoices" WHERE "sent_at" IS NOT NULL
  UNION ALL
  SELECT "user_id", 'invoice.reminder_sent', 'invoice', "id", NULL, "last_reminder_sent_at" FROM "invoices" WHERE "last_reminder_sent_at" IS NOT NULL
  UNION ALL
  SELECT "user_id", 'invoice.paid', 'invoice', "id", NULL, "paid_at" FROM "invoices" WHERE "status" = 'paid' AND "paid_at" IS NOT NULL
  UNION ALL
  SELECT "user_id", 'invoice.payment_claimed', 'invoice', "id", jsonb_build_object('note', "payment_claimed_note"), "payment_claimed_at"
  FROM "invoices" WHERE "payment_claimed_at" IS NOT NULL

  UNION ALL
  SELECT "user_id", 'proposal.created', 'proposal', "id", NULL, "created_at" FROM "proposals"
  UNION ALL
  SELECT "user_id", 'proposal.viewed', 'proposal', "id", NULL, "viewed_at" FROM "proposals" WHERE "viewed_at" IS NOT NULL
  UNION ALL
  SELECT "user_id", 'proposal.accepted', 'proposal', "id", NULL, "accepted_at" FROM "proposals" WHERE "accepted_at" IS NOT NULL
  UNION ALL
  SELECT "user_id", 'proposal.declined', 'proposal', "id", jsonb_build_object('reason', "decline_reason"), "rejected_at"
  FROM "proposals" WHERE "rejected_at" IS NOT NULL
  UNION ALL
  SELECT "user_id", 'proposal.revoked', 'proposal', "id", NULL, "revoked_at" FROM "proposals" WHERE "revoked_at" IS NOT NULL

  UNION ALL
  SELECT "user_id", 'project.created', 'project', "id", NULL, "created_at" FROM "projects"
  UNION ALL
  -- No completed_at column; updated_at is the closest time we have.
  SELECT p."user_id", 'milestone.completed', 'milestone', m."id", NULL, m."updated_at"
  FROM "milestones" m JOIN "projects" p ON p."id" = m."project_id"
  WHERE m."status" = 'completed'
) e
WHERE NOT EXISTS (
  SELECT 1 FROM "activity_logs" a
  WHERE a."user_id" = e.user_id
    AND a."action" = e.action
    AND a."entity_id" = e.entity_id
);
