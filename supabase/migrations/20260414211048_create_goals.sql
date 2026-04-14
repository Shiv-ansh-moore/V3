-- ============================================================================
-- goals: personal goals owned by a user, visible to the user's group.
--
-- MVP is solo-owned (no group_id). Group-set goals ship later as a separate
-- migration that adds a group_id column + a second read policy.
-- ============================================================================
create table public.goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  title       text not null,
  icon        text not null,
  duration    text,
  status      text not null default 'active',
  created_at  timestamptz not null default now(),
  archived_at timestamptz,
  constraint goals_status_check check (status in ('active', 'done'))
);

-- Main query is "my active goals" — partial index keeps it lean.
create index goals_user_active on public.goals (user_id)
  where status = 'active' and archived_at is null;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.goals enable row level security;

-- Read: my own goals, plus goals of anyone who shares my group.
create policy "view own and group goals" on public.goals for select to authenticated
using (
  user_id = (select auth.uid())
  or public.shares_group_with (user_id)
);

-- Insert: I can only create goals for myself.
create policy "create own goals" on public.goals for insert to authenticated
with check (user_id = (select auth.uid()));

-- Update: I can only edit my own goals, and can't reassign ownership.
create policy "update own goals" on public.goals for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Delete: I can delete my own goals.
create policy "delete own goals" on public.goals for delete to authenticated
using (user_id = (select auth.uid()));
