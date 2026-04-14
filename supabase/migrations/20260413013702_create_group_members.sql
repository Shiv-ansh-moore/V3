-- ============================================================================
-- group_members: who belongs to which group
-- Composite PK (group_id, user_id) — a user can only appear once per group.
-- ============================================================================
create table
  public.group_members (
    group_id uuid not null references public.groups (id) on delete cascade,
    user_id uuid not null references public.profiles (id) on delete cascade,
    joined_at timestamptz not null default now(),
    primary key (group_id, user_id)
  );

-- MVP: one group per user. Drop this index when going multi-group.
create unique index group_members_one_per_user on public.group_members (user_id);

-- ============================================================================
-- Membership check helper
-- security definer so RLS policies can call it without recursing on group_members
-- ============================================================================
create
or replace function public.is_group_member (p_group_id uuid, p_user_id uuid) returns boolean language sql security definer
set
  search_path = public stable as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = p_user_id
  );
  $$;

grant
execute on function public.is_group_member (uuid, uuid) to authenticated;

-- ============================================================================
-- Enforce max 7 members per group
-- ============================================================================
create
or replace function public.enforce_group_max_members () returns trigger language plpgsql
set
  search_path = public as $$
  declare
    v_count int;
  begin
    select count(*) into v_count
    from public.group_members
    where group_id = new.group_id;

    if v_count >= 7 then
      raise exception 'group is full (max 7 members)';
    end if;

    return new;
  end;
  $$;

create trigger group_members_enforce_max before insert on public.group_members for each row
execute function public.enforce_group_max_members ();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.group_members enable row level security;

-- Members can see co-members of their group.
create policy "members can view co-members" on public.group_members for
select
  to authenticated using (
    public.is_group_member (
      group_id,
      (
        select
          auth.uid ()
      )
    )
  );

-- Users can leave their own group.
create policy "users can leave group" on public.group_members for delete to authenticated using (
  (
    select
      auth.uid ()
  ) = user_id
);

-- Inserts go through create_group / join_group RPCs — no direct insert policy.
-- ============================================================================
-- groups select policy (now that is_group_member exists)
-- ============================================================================
create policy "members can view their group" on public.groups for
select
  to authenticated using (
    public.is_group_member (
      id,
      (
        select
          auth.uid ()
      )
    )
  );