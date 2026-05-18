-- Shorten batch windows so social notifications feel live while still
-- collapsing bursts into one push.
create
or replace function public.notification_batch_quiet_window (
  p_kind public.notification_batch_kind
) returns interval
language sql
immutable
set search_path = public
as $$
  select case p_kind
    when 'messages' then interval '30 seconds'
    when 'proofs' then interval '60 seconds'
    when 'reactions' then interval '30 seconds'
  end;
$$;

create
or replace function public.notification_batch_max_window (
  p_kind public.notification_batch_kind
) returns interval
language sql
immutable
set search_path = public
as $$
  select case p_kind
    when 'messages' then interval '2 minutes'
    when 'proofs' then interval '3 minutes'
    when 'reactions' then interval '2 minutes'
  end;
$$;

create
or replace function public.queue_notification_event (
  p_recipient_id uuid,
  p_group_id uuid,
  p_kind public.notification_batch_kind,
  p_target_kind public.notification_target_kind,
  p_actor_id uuid,
  p_message_id uuid,
  p_proof_id uuid,
  p_session_id uuid,
  p_emoji text,
  p_source_key text,
  p_event_created_at timestamptz default now()
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch_id uuid;
  v_event_time timestamptz := coalesce(p_event_created_at, now());
  v_quiet_window interval := public.notification_batch_quiet_window(p_kind);
  v_max_window interval := public.notification_batch_max_window(p_kind);
begin
  if p_recipient_id is null
     or p_group_id is null
     or nullif(btrim(p_source_key), '') is null then
    return null;
  end if;

  if p_actor_id is not null and p_actor_id = p_recipient_id then
    return null;
  end if;

  if not public.notification_preference_enabled(p_recipient_id, p_kind) then
    return null;
  end if;

  if exists (
    select 1
    from public.notification_events
    where source_key = p_source_key
  ) then
    return null;
  end if;

  loop
    select id
    into v_batch_id
    from public.notification_batches
    where recipient_id = p_recipient_id
      and group_id = p_group_id
      and kind = p_kind
      and target_kind is not distinct from p_target_kind
      and status = 'pending'
    order by created_at
    limit 1
    for update;

    if found then
      update public.notification_batches
      set ready_at = least(max_ready_at, v_event_time + v_quiet_window)
      where id = v_batch_id;
      exit;
    end if;

    begin
      insert into public.notification_batches (
        recipient_id,
        group_id,
        kind,
        target_kind,
        window_started_at,
        ready_at,
        max_ready_at
      )
      values (
        p_recipient_id,
        p_group_id,
        p_kind,
        p_target_kind,
        v_event_time,
        v_event_time + v_quiet_window,
        v_event_time + v_max_window
      )
      returning id into v_batch_id;

      exit;
    exception
      when unique_violation then
        -- Another transaction created the pending batch. Re-select it.
    end;
  end loop;

  insert into public.notification_events (
    batch_id,
    recipient_id,
    group_id,
    kind,
    target_kind,
    actor_id,
    message_id,
    proof_id,
    session_id,
    emoji,
    source_key,
    created_at
  )
  values (
    v_batch_id,
    p_recipient_id,
    p_group_id,
    p_kind,
    p_target_kind,
    p_actor_id,
    p_message_id,
    p_proof_id,
    p_session_id,
    nullif(btrim(p_emoji), ''),
    btrim(p_source_key),
    v_event_time
  )
  on conflict (source_key) do nothing;

  if not found then
    return null;
  end if;

  return v_batch_id;
end;
$$;

revoke all on function public.notification_batch_quiet_window (
  public.notification_batch_kind
) from public;

revoke all on function public.notification_batch_max_window (
  public.notification_batch_kind
) from public;

revoke all on function public.queue_notification_event (
  uuid,
  uuid,
  public.notification_batch_kind,
  public.notification_target_kind,
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text,
  timestamptz
) from public;
