-- ============================================================================
-- goals soft delete: keep goal rows for accountability/history while hiding
-- deleted goals from normal goal lists.
-- ============================================================================
alter table public.goals
  add column if not exists deleted_at timestamptz;

alter table public.goals
  alter column status set default 'active';

alter table public.goals
  drop constraint if exists goals_status_check;

alter table public.goals
  add constraint goals_status_check
  check (status in ('active', 'done', 'deleted'));

create index if not exists goals_user_visible
  on public.goals (user_id, created_at)
  where archived_at is null
    and deleted_at is null
    and status <> 'deleted';

drop policy if exists "delete own goals" on public.goals;

drop policy if exists "create own proof" on public.proofs;

create policy "create own proof" on public.proofs for insert to authenticated
with
  check (
    user_id = (
      select
        auth.uid ()
    )
    and exists (
      select
        1
      from
        public.goals
      where
        id = goal_id
        and user_id = (
          select
            auth.uid ()
        )
        and status <> 'deleted'
        and deleted_at is null
    )
  );

create
or replace function public.mark_goal_done_on_proof () returns trigger language plpgsql security definer
set
  search_path = public as $$
declare
  updated_goal_count integer;
begin
  update public.goals
    set status = 'done'
    where id = new.goal_id
      and status <> 'deleted'
      and deleted_at is null;

  get diagnostics updated_goal_count = row_count;

  if updated_goal_count = 0 then
    raise exception 'cannot submit proof for deleted goal';
  end if;

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
