-- ============================================================================
-- proofs: photo (later video) submissions for personal goals.
--
-- One proof per goal — goals are one-shot in MVP. Re-adding a goal creates
-- a new goal row, not a new proof for the old one (enforced by unique(goal_id)).
--
-- Proofs are immutable after submission: no UPDATE policy.
-- ============================================================================
create table public.proofs (
  id           uuid primary key default gen_random_uuid(),
  goal_id      uuid not null unique references public.goals (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  image_path   text not null,
  caption      text,
  submitted_at timestamptz not null default now()
);

-- Drives story viewer + avatar ring queries: "this user's recent proofs".
create index proofs_user_submitted on public.proofs (user_id, submitted_at desc);

-- ============================================================================
-- After-insert trigger: flip the associated goal to 'done'.
-- Runs in the inserter's context — they already own the goal, so RLS on the
-- goals UPDATE policy allows the update without security definer.
-- ============================================================================
create or replace function public.mark_goal_done_on_proof ()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update public.goals
    set status = 'done'
    where id = new.goal_id;
  return new;
end;
$$;

create trigger proofs_mark_goal_done
after insert on public.proofs
for each row
execute function public.mark_goal_done_on_proof ();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.proofs enable row level security;

-- Read: your own proofs, or a group-mate's.
create policy "view own and group proofs" on public.proofs for select to authenticated
using (
  user_id = (select auth.uid())
  or public.shares_group_with (user_id)
);

-- Insert: must be your own proof AND goal_id must belong to you.
create policy "create own proof" on public.proofs for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.goals
    where id = goal_id and user_id = (select auth.uid())
  )
);

-- Delete: own proofs only.
create policy "delete own proof" on public.proofs for delete to authenticated
using (user_id = (select auth.uid()));

-- No UPDATE policy: proofs are immutable.
