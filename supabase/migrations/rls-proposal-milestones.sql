-- Row level security for proposal_milestones.
--
-- drizzle-kit only generates structural DDL, so a table it creates arrives
-- with RLS off. On Supabase that means the anon key can read it through
-- PostgREST, so this has to run alongside 0002 rather than some time later.
--
-- Mirrors the proposal_items policy: a milestone is reachable only through a
-- proposal its owner holds.

-- PROPOSAL_MILESTONES (via parent proposal)
alter table proposal_milestones enable row level security;
drop policy if exists "users_manage_own_proposal_milestones" on proposal_milestones;
create policy "users_manage_own_proposal_milestones" on proposal_milestones
  for all using (
    exists (
      select 1 from proposals
      where proposals.id = proposal_milestones.proposal_id
      and proposals.user_id = auth.uid()
    )
  );
