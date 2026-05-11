-- ============================================================================
-- screen session RPCs: create/update the session and fan out chat events.
--
-- The app is MVP one-group today, but these functions intentionally insert
-- messages from group_members so multi-group fan-out works when that constraint
-- is removed later.
-- ============================================================================

-- Direct message inserts should be user-authored text only. Proof and screen
-- session events are emitted by database functions/triggers.
drop policy if exists "post group message" on public.messages;

create policy "post group message" on public.messages for insert to authenticated
with
  check (
    kind = 'text'
    and sender_id = (
      select
        auth.uid ()
    )
    and public.is_group_member (
      group_id,
      (
        select
          auth.uid ()
      )
    )
  );

-- Direct session writes now go through the RPCs below.
drop policy if exists "start own session" on public.screen_sessions;
drop policy if exists "end own session early" on public.screen_sessions;

-- Prevent duplicate screen-session event messages per group/session/kind.
create unique index if not exists messages_screen_session_event_unique
on public.messages (group_id, kind, session_id)
where kind in ('unlock', 'lock') and session_id is not null;

-- Make the helper truly multi-group-ready while preserving current behavior.
create
or replace function public.shares_group_with (p_other_user_id uuid) returns boolean language sql security definer
set
  search_path = public stable as $$
  select exists (
    select 1
    from public.group_members mine
    join public.group_members other_member
      on other_member.group_id = mine.group_id
    where mine.user_id = (select auth.uid())
      and other_member.user_id = p_other_user_id
  );
$$;

grant
execute on function public.shares_group_with (uuid) to authenticated;

create
or replace function public.start_screen_session (
  p_granted_seconds int,
  p_reason text,
  p_app_name text,
  p_app_icon text
) returns public.screen_sessions language plpgsql security definer
set
  search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_session public.screen_sessions;
  v_message_count int;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  if p_granted_seconds is null or p_granted_seconds <= 0 then
    raise exception 'granted seconds must be greater than zero';
  end if;

  insert into public.screen_sessions (
    user_id,
    app_name,
    app_icon,
    reason,
    granted_seconds
  )
  values (
    v_uid,
    nullif(btrim(p_app_name), ''),
    nullif(btrim(p_app_icon), ''),
    nullif(btrim(p_reason), ''),
    p_granted_seconds
  )
  returning * into v_session;

  insert into public.messages (
    group_id,
    sender_id,
    kind,
    session_id
  )
  select
    gm.group_id,
    v_uid,
    'unlock',
    v_session.id
  from public.group_members gm
  where gm.user_id = v_uid
  on conflict do nothing;

  get diagnostics v_message_count = row_count;
  if v_message_count = 0 then
    raise exception 'group membership required';
  end if;

  return v_session;
end;
$$;

grant
execute on function public.start_screen_session (int, text, text, text) to authenticated;

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

  insert into public.messages (
    group_id,
    sender_id,
    kind,
    session_id
  )
  select
    gm.group_id,
    v_uid,
    'lock',
    v_session.id
  from public.group_members gm
  where gm.user_id = v_uid
  on conflict do nothing;

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

  insert into public.messages (
    group_id,
    sender_id,
    kind,
    session_id,
    created_at
  )
  select
    gm.group_id,
    v_uid,
    'lock',
    v_session.id,
    v_session.started_at + make_interval(secs => v_session.granted_seconds)
  from public.group_members gm
  where gm.user_id = v_uid
  on conflict do nothing;

  return v_session;
end;
$$;

grant
execute on function public.complete_screen_session (uuid) to authenticated;
