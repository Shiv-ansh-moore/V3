-- ============================================================================
-- proof messages: create a feed entry when a proof is submitted.
--
-- Extends the existing proofs after-insert side effect so proof submission
-- both marks the goal done and posts a `kind = 'proof'` message into every
-- group the author belongs to.
--
-- MVP currently enforces one group per user, but this implementation is
-- future-proofed for multi-group membership by fan-out inserting from
-- group_members rather than selecting a single group_id.
-- ============================================================================
create
or replace function public.mark_goal_done_on_proof () returns trigger language plpgsql security definer
set
    search_path = public as $$
begin
  update public.goals
    set status = 'done'
    where id = new.goal_id;

  insert into public.messages (
    group_id,
    sender_id,
    kind,
    proof_id
  )
  select
    gm.group_id,
    new.user_id,
    'proof',
    new.id
  from public.group_members gm
  where gm.user_id = new.user_id;

  return new;
end;
$$;