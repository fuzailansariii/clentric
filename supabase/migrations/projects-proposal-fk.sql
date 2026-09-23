-- Foreign key for projects.proposal_id -> proposals.id.
--
-- Hand-written rather than generated because the reference cannot live in the
-- Drizzle schema. proposals already references invoices (deposit_invoice_id)
-- and invoices references projects, so declaring projects -> proposals in
-- TypeScript closes the loop invoices -> projects -> proposals -> invoices.
-- That cycle breaks Drizzle's relational type inference: db.query.invoices
-- .findFirst() stops resolving its own columns and the invoice pages fail to
-- typecheck. The column and its indexes are generated normally; only this
-- constraint is applied here.
--
-- ON DELETE SET NULL, deliberately: deleting a proposal must never take a
-- live project with it. The project simply forgets where it came from.
--
-- Run after 0005_nostalgic_catseye.sql, which creates the column.
-- Safely re-runnable.

do $$
begin
  alter table projects
    add constraint projects_proposal_id_proposals_id_fk
    foreign key (proposal_id) references proposals(id)
    on delete set null;
exception
  when duplicate_object then null;
end $$;
