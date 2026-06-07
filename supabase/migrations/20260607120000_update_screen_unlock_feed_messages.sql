-- Keep screen unlock sessions as one feed item. Early relocks update the
-- screen_sessions row, and clients refresh the existing unlock message.

delete from public.messages
where kind = 'lock';

drop index if exists public.messages_screen_session_event_unique;

create unique index if not exists messages_screen_session_event_unique
on public.messages (group_id, kind, session_id)
where kind = 'unlock' and session_id is not null;

create
or replace function public.finish_screen_session (
  p_session_id uuid,
  p_actual_seconds int
) returns public.screen_sessions language plpgsql security definer
set
  search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_session public.screen_sessions;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  if p_actual_seconds is null or p_actual_seconds < 0 then
    raise exception 'actual seconds must be zero or greater';
  end if;

  if not exists (
    select 1
    from public.group_members gm
    where gm.user_id = v_uid
  ) then
    raise exception 'group membership required';
  end if;

  select * into v_session
  from public.screen_sessions
  where id = p_session_id
    and user_id = v_uid;

  if not found then
    raise exception 'screen session not found';
  end if;

  if v_session.actual_seconds is null then
    if p_actual_seconds >= v_session.granted_seconds then
      raise exception 'actual seconds must be less than granted seconds';
    end if;

    update public.screen_sessions
      set actual_seconds = p_actual_seconds
      where id = p_session_id
        and user_id = v_uid
      returning * into v_session;
  end if;

  return v_session;
end;
$$;

grant
execute on function public.finish_screen_session (uuid, int) to authenticated;

create
or replace function public.complete_screen_session (
  p_session_id uuid
) returns public.screen_sessions language plpgsql security definer
set
  search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_session public.screen_sessions;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  if not exists (
    select 1
    from public.group_members gm
    where gm.user_id = v_uid
  ) then
    raise exception 'group membership required';
  end if;

  select * into v_session
  from public.screen_sessions
  where id = p_session_id
    and user_id = v_uid;

  if not found then
    raise exception 'screen session not found';
  end if;

  return v_session;
end;
$$;

grant
execute on function public.complete_screen_session (uuid) to authenticated;

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  )
  and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'screen_sessions'
  ) then
    alter publication supabase_realtime add table public.screen_sessions;
  end if;
end $$;
