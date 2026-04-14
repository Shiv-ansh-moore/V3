-- ============================================================================
-- screen_sessions: one row per app-unlock session.
--
-- Unlock = insert the row (granted_seconds set, actual_seconds null).
-- Auto-lock (full window used) = row stays as-is; actual_seconds stays null.
-- Manual early-lock (app open) = UPDATE the row to set actual_seconds.
--
-- Feed messages are inserted alongside: always an "unlock" message; a "lock"
-- message is only inserted when the user manually locks early. Auto-locks
-- produce no message — the group infers end-time from granted_seconds.
--
-- Analytics: sum(coalesce(actual_seconds, granted_seconds)) = total used.
-- ============================================================================
create table
  public.screen_sessions (
    id uuid primary key default gen_random_uuid (),
    user_id uuid not null references public.profiles (id) on delete cascade,
    app_name text,
    app_icon text,
    reason text,
    granted_seconds int not null check (granted_seconds >= 0),
    actual_seconds int check (
      actual_seconds is null
      or (
        actual_seconds >= 0
        and actual_seconds < granted_seconds
      )
    ),
    started_at timestamptz not null default now()
  );

create index screen_sessions_user_started on public.screen_sessions (user_id, started_at desc);

-- ============================================================================
-- Update guard: only actual_seconds can change, and only from NULL → value.
-- Prevents history amendment and column-substitution attacks via UPDATE.
-- ============================================================================
create
or replace function public.guard_screen_session_update () returns trigger language plpgsql
set
  search_path = public as $$
begin
  if old.actual_seconds is not null then
    raise exception 'actual_seconds already set — session is immutable once locked';
  end if;
  if new.actual_seconds is null then
    raise exception 'update must set actual_seconds';
  end if;
  if new.id              is distinct from old.id
     or new.user_id      is distinct from old.user_id
     or new.app_name     is distinct from old.app_name
     or new.app_icon     is distinct from old.app_icon
     or new.reason       is distinct from old.reason
     or new.granted_seconds is distinct from old.granted_seconds
     or new.started_at   is distinct from old.started_at then
    raise exception 'only actual_seconds may be updated';
  end if;
  return new;
end;
$$;

create trigger screen_sessions_guard_update before
update on public.screen_sessions for each row
execute function public.guard_screen_session_update ();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.screen_sessions enable row level security;

-- Read: your own sessions, or a group-mate's.
create policy "view own and group sessions" on public.screen_sessions for
select
  to authenticated using (
    user_id = (
      select
        auth.uid ()
    )
    or public.shares_group_with (user_id)
  );

-- Insert: only your own sessions.
create policy "start own session" on public.screen_sessions for insert to authenticated
with
  check (
    user_id = (
      select
        auth.uid ()
    )
  );

-- Update: own rows only. Trigger enforces column-level constraints.
create policy "end own session early" on public.screen_sessions for
update to authenticated using (
  user_id = (
    select
      auth.uid ()
  )
)
with
  check (
    user_id = (
      select
        auth.uid ()
    )
  );

-- No DELETE policy: history is immutable.