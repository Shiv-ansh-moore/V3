-- ============================================================================
-- Push notifications: device tokens, preferences, batching, and event triggers.
--
-- Expo sends happen from Edge Functions. Postgres owns event selection so the
-- same rules apply whether events are created by clients, RPCs, or triggers.
-- ============================================================================

create table public.push_tokens (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references public.profiles (id) on delete cascade,
  device_id text not null,
  expo_push_token text not null,
  platform text not null default 'unknown',
  app_version text,
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_tokens_platform_check check (
    platform in ('ios', 'android', 'web', 'unknown')
  ),
  constraint push_tokens_user_device_unique unique (user_id, device_id)
);

create index push_tokens_user_enabled_idx on public.push_tokens (user_id)
where enabled;

create index push_tokens_device_idx on public.push_tokens (device_id);
create index push_tokens_expo_push_token_idx on public.push_tokens (expo_push_token);

create trigger push_tokens_set_updated_at before
update on public.push_tokens for each row
execute function public.set_updated_at ();

alter table public.push_tokens enable row level security;

create policy "users can view own push tokens" on public.push_tokens for
select
  to authenticated using (
    user_id = (
      select auth.uid ()
    )
  );

create policy "users can insert own push tokens" on public.push_tokens for insert to authenticated
with
  check (
    user_id = (
      select auth.uid ()
    )
  );

create policy "users can update own push tokens" on public.push_tokens for
update to authenticated using (
  user_id = (
    select auth.uid ()
  )
)
with
  check (
    user_id = (
      select auth.uid ()
    )
  );

create policy "users can delete own push tokens" on public.push_tokens for delete to authenticated using (
  user_id = (
    select auth.uid ()
  )
);

create table public.notification_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  messages_enabled boolean not null default true,
  proofs_enabled boolean not null default true,
  reactions_enabled boolean not null default true,
  screen_unlocks_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger notification_preferences_set_updated_at before
update on public.notification_preferences for each row
execute function public.set_updated_at ();

insert into public.notification_preferences (user_id)
select id
from public.profiles
on conflict (user_id) do nothing;

create
or replace function public.ensure_notification_preferences () returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists profiles_ensure_notification_preferences on public.profiles;

create trigger profiles_ensure_notification_preferences
after insert on public.profiles for each row
execute function public.ensure_notification_preferences ();

alter table public.notification_preferences enable row level security;

create policy "users can view own notification preferences"
on public.notification_preferences for select to authenticated using (
  user_id = (
    select auth.uid ()
  )
);

create policy "users can update own notification preferences"
on public.notification_preferences for update to authenticated using (
  user_id = (
    select auth.uid ()
  )
)
with
  check (
    user_id = (
      select auth.uid ()
    )
  );

create policy "users can insert own notification preferences"
on public.notification_preferences for insert to authenticated
with
  check (
    user_id = (
      select auth.uid ()
    )
  );

create type public.notification_batch_kind as enum (
  'messages',
  'proofs',
  'reactions'
);

create type public.notification_target_kind as enum (
  'message',
  'proof'
);

create type public.notification_batch_status as enum (
  'pending',
  'processing',
  'sent',
  'failed'
);

create table public.notification_batches (
  id uuid primary key default gen_random_uuid (),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  kind public.notification_batch_kind not null,
  target_kind public.notification_target_kind,
  status public.notification_batch_status not null default 'pending',
  window_started_at timestamptz not null default now(),
  ready_at timestamptz not null default (now() + interval '2 minutes'),
  max_ready_at timestamptz not null default (now() + interval '10 minutes'),
  attempt_count int not null default 0,
  locked_at timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index notification_batches_pending_unique
on public.notification_batches (
  recipient_id,
  group_id,
  kind,
  target_kind
)
nulls not distinct
where status = 'pending';

create index notification_batches_due_idx
on public.notification_batches (ready_at)
where status = 'pending';

create trigger notification_batches_set_updated_at before
update on public.notification_batches for each row
execute function public.set_updated_at ();

alter table public.notification_batches enable row level security;

create table public.notification_events (
  id uuid primary key default gen_random_uuid (),
  batch_id uuid not null references public.notification_batches (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  kind public.notification_batch_kind not null,
  target_kind public.notification_target_kind,
  actor_id uuid references public.profiles (id) on delete set null,
  message_id uuid references public.messages (id) on delete cascade,
  proof_id uuid references public.proofs (id) on delete cascade,
  session_id uuid references public.screen_sessions (id) on delete cascade,
  emoji text,
  source_key text not null unique,
  created_at timestamptz not null default now()
);

create index notification_events_batch_created_idx
on public.notification_events (batch_id, created_at);

alter table public.notification_events enable row level security;

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid (),
  batch_id uuid references public.notification_batches (id) on delete set null,
  notification_kind text not null,
  recipient_id uuid references public.profiles (id) on delete set null,
  push_token_id uuid references public.push_tokens (id) on delete set null,
  expo_ticket_id text,
  status text not null,
  error text,
  created_at timestamptz not null default now()
);

create index notification_deliveries_batch_idx
on public.notification_deliveries (batch_id);

create index notification_deliveries_token_idx
on public.notification_deliveries (push_token_id);

alter table public.notification_deliveries enable row level security;

create
or replace function public.register_push_token (
  p_device_id text,
  p_expo_push_token text,
  p_platform text,
  p_app_version text
) returns public.push_tokens
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_token public.push_tokens;
  v_platform text := coalesce(nullif(btrim(p_platform), ''), 'unknown');
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  if nullif(btrim(p_device_id), '') is null then
    raise exception 'device id is required';
  end if;

  if nullif(btrim(p_expo_push_token), '') is null then
    raise exception 'expo push token is required';
  end if;

  if v_platform not in ('ios', 'android', 'web', 'unknown') then
    v_platform := 'unknown';
  end if;

  update public.push_tokens
  set enabled = false
  where user_id <> v_uid
    and (
      device_id = p_device_id
      or expo_push_token = p_expo_push_token
    );

  insert into public.push_tokens (
    user_id,
    device_id,
    expo_push_token,
    platform,
    app_version,
    enabled,
    last_seen_at
  )
  values (
    v_uid,
    btrim(p_device_id),
    btrim(p_expo_push_token),
    v_platform,
    nullif(btrim(p_app_version), ''),
    true,
    now()
  )
  on conflict (user_id, device_id) do update
  set expo_push_token = excluded.expo_push_token,
      platform = excluded.platform,
      app_version = excluded.app_version,
      enabled = true,
      last_seen_at = now()
  returning * into v_token;

  return v_token;
end;
$$;

revoke all on function public.register_push_token (text, text, text, text)
from public;

grant execute on function public.register_push_token (text, text, text, text)
to authenticated;

create
or replace function public.notification_preference_enabled (
  p_user_id uuid,
  p_kind public.notification_batch_kind
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enabled boolean;
begin
  select
    case p_kind
      when 'messages' then messages_enabled
      when 'proofs' then proofs_enabled
      when 'reactions' then reactions_enabled
    end
  into v_enabled
  from public.notification_preferences
  where user_id = p_user_id;

  return coalesce(v_enabled, true);
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
      set ready_at = least(max_ready_at, v_event_time + interval '2 minutes')
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
        v_event_time + interval '2 minutes',
        v_event_time + interval '10 minutes'
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

create
or replace function public.get_notification_secret (p_name text) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
begin
  if to_regclass('vault.decrypted_secrets') is null then
    return null;
  end if;

  execute
    'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1'
  into v_secret
  using p_name;

  return nullif(v_secret, '');
exception
  when others then
    return null;
end;
$$;

create
or replace function public.invoke_notification_edge_function (
  p_function_name text,
  p_body jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_url text;
  v_webhook_secret text;
  v_url text;
  v_headers jsonb;
  v_request_id bigint;
begin
  v_project_url := coalesce(
    public.get_notification_secret('supabase_project_url'),
    public.get_notification_secret('project_url')
  );

  if nullif(btrim(v_project_url), '') is null then
    raise notice 'Skipping notification Edge Function invocation: missing supabase_project_url Vault secret';
    return;
  end if;

  v_webhook_secret := coalesce(
    public.get_notification_secret('notification_webhook_secret'),
    public.get_notification_secret('NOTIFICATION_WEBHOOK_SECRET')
  );

  v_url := rtrim(v_project_url, '/') || '/functions/v1/' || p_function_name;
  v_headers := jsonb_build_object('Content-Type', 'application/json');

  if v_webhook_secret is not null then
    v_headers := v_headers || jsonb_build_object(
      'x-notification-secret',
      v_webhook_secret
    );
  end if;

  begin
    execute
      'select net.http_post(url := $1::text, headers := $2::jsonb, body := $3::jsonb, timeout_milliseconds := $4::integer)'
    into v_request_id
    using v_url, v_headers, p_body, 1000;
  exception
    when undefined_function or invalid_schema_name then
      raise notice 'Skipping notification Edge Function invocation: pg_net is not available';
    when others then
      raise notice 'Notification Edge Function invocation failed: %', sqlerrm;
  end;
end;
$$;

create
or replace function public.handle_message_notification () returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member record;
begin
  if new.kind = 'text' and new.sender_id is not null then
    for v_member in
      select gm.user_id
      from public.group_members gm
      where gm.group_id = new.group_id
        and gm.user_id <> new.sender_id
    loop
      perform public.queue_notification_event(
        v_member.user_id,
        new.group_id,
        'messages',
        null,
        new.sender_id,
        new.id,
        null,
        null,
        null,
        'message:' || new.id::text || ':' || v_member.user_id::text,
        new.created_at
      );
    end loop;
  elsif new.kind = 'proof' and new.sender_id is not null then
    for v_member in
      select gm.user_id
      from public.group_members gm
      where gm.group_id = new.group_id
        and gm.user_id <> new.sender_id
    loop
      perform public.queue_notification_event(
        v_member.user_id,
        new.group_id,
        'proofs',
        null,
        new.sender_id,
        new.id,
        new.proof_id,
        null,
        null,
        'proof:' || new.id::text || ':' || v_member.user_id::text,
        new.created_at
      );
    end loop;
  elsif new.kind = 'unlock' and new.sender_id is not null then
    perform public.invoke_notification_edge_function(
      'send-screen-unlock-notification',
      jsonb_build_object(
        'message_id', new.id,
        'group_id', new.group_id,
        'actor_id', new.sender_id,
        'session_id', new.session_id
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists messages_handle_notification on public.messages;

create trigger messages_handle_notification
after insert on public.messages for each row
execute function public.handle_message_notification ();

create
or replace function public.handle_reaction_notification () returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message record;
  v_target_kind public.notification_target_kind;
begin
  select
    m.id,
    m.sender_id,
    m.group_id,
    m.kind,
    m.proof_id
  into v_message
  from public.messages m
  where m.id = new.message_id;

  if not found
     or v_message.sender_id is null
     or v_message.sender_id = new.user_id
     or v_message.kind not in ('text', 'proof') then
    return new;
  end if;

  v_target_kind := case
    when v_message.kind = 'proof' then 'proof'::public.notification_target_kind
    else 'message'::public.notification_target_kind
  end;

  perform public.queue_notification_event(
    v_message.sender_id,
    v_message.group_id,
    'reactions',
    v_target_kind,
    new.user_id,
    new.message_id,
    v_message.proof_id,
    null,
    new.emoji,
    'reaction:' || new.message_id::text || ':' || new.user_id::text || ':' ||
      new.emoji || ':' ||
      to_char(new.created_at at time zone 'utc', 'YYYYMMDDHH24MISSUS'),
    new.created_at
  );

  return new;
end;
$$;

drop trigger if exists reactions_handle_notification on public.reactions;

create trigger reactions_handle_notification
after insert on public.reactions for each row
execute function public.handle_reaction_notification ();

create
or replace function public.claim_due_notification_batches (
  p_limit int default 25
) returns setof public.notification_batches
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notification_batches
  set status = 'pending',
      locked_at = null,
      last_error = null
  where status = 'processing'
    and locked_at < now() - interval '5 minutes'
    and attempt_count < 5;

  update public.notification_batches
  set status = 'failed',
      last_error = coalesce(last_error, 'retry limit reached')
  where status = 'processing'
    and locked_at < now() - interval '5 minutes'
    and attempt_count >= 5;

  return query
  with due as (
    select id
    from public.notification_batches
    where status = 'pending'
      and ready_at <= now()
    order by ready_at asc
    limit greatest(1, least(coalesce(p_limit, 25), 100))
    for update skip locked
  )
  update public.notification_batches b
  set status = 'processing',
      locked_at = now(),
      attempt_count = b.attempt_count + 1,
      last_error = null
  from due
  where b.id = due.id
  returning b.*;
end;
$$;

revoke all on function public.claim_due_notification_batches (int)
from public;

grant execute on function public.claim_due_notification_batches (int)
to service_role;

create
or replace function public.invoke_notification_batch_sender () returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.invoke_notification_edge_function(
    'send-notification-batches',
    jsonb_build_object('source', 'cron')
  );
end;
$$;

do $$
begin
  if to_regclass('cron.job') is null then
    raise notice 'Skipping notification batch cron schedule: pg_cron is not available';
    return;
  end if;

  begin
    perform cron.unschedule('send-notification-batches');
  exception
    when others then
      null;
  end;

  perform cron.schedule(
    'send-notification-batches',
    '* * * * *',
    'select public.invoke_notification_batch_sender();'
  );
exception
  when undefined_function or invalid_schema_name then
    raise notice 'Skipping notification batch cron schedule: pg_cron is not available';
  when others then
    raise notice 'Notification batch cron schedule failed: %', sqlerrm;
end $$;

revoke all on function public.notification_preference_enabled (
  uuid,
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

revoke all on function public.get_notification_secret (text) from public;
revoke all on function public.invoke_notification_edge_function (text, jsonb) from public;
revoke all on function public.invoke_notification_batch_sender () from public;
revoke all on function public.ensure_notification_preferences () from public;
revoke all on function public.handle_message_notification () from public;
revoke all on function public.handle_reaction_notification () from public;
