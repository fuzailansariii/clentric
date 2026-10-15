-- Project budgets are now before tax, like milestones. A project made from a
-- taxed proposal stored the proposal total; one still at that total gets the subtotal.
UPDATE "projects" AS p
SET "budget" = pr."subtotal"
FROM "proposals" AS pr
WHERE p."proposal_id" = pr."id"
  AND pr."tax_rate" > 0
  AND p."budget" = pr."total";
