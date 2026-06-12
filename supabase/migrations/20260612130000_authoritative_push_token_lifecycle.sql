-- Make server-side push token state authoritative for account/device delivery.

alter table public.push_tokens
add column if not exists expires_at timestamptz,
add column if not exists disabled_at timestamptz,
add column if not exists disabled_reason text;

update public.push_tokens
set expires_at = coalesce(expires_at, last_seen_at + interval '30 days');

update public.push_tokens
set enabled = false,
    disabled_at = coalesce(disabled_at, now()),
    disabled_reason = coalesce(disabled_reason, 'expired')
where enabled = true
  and expires_at <= now();

alter table public.push_tokens
alter column expires_at set default (now() + interval '30 days'),
alter column expires_at set not null;

create index if not exists push_tokens_user_enabled_expires_idx
on public.push_tokens (user_id, expires_at)
where enabled;

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
  v_device_id text := nullif(btrim(p_device_id), '');
  v_expo_push_token text := nullif(btrim(p_expo_push_token), '');
  v_platform text := coalesce(nullif(btrim(p_platform), ''), 'unknown');
  v_app_version text := nullif(btrim(p_app_version), '');
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  if v_device_id is null then
    raise exception 'device id is required';
  end if;

  if v_expo_push_token is null then
    raise exception 'expo push token is required';
  end if;

  if v_platform not in ('ios', 'android', 'web', 'unknown') then
    v_platform := 'unknown';
  end if;

  update public.push_tokens
  set enabled = false,
      disabled_at = now(),
      disabled_reason = 'registration_conflict'
  where enabled = true
    and (
      device_id = v_device_id
      or expo_push_token = v_expo_push_token
    )
    and not (
      user_id = v_uid
      and device_id = v_device_id
    );

  insert into public.push_tokens (
    user_id,
    device_id,
    expo_push_token,
    platform,
    app_version,
    enabled,
    last_seen_at,
    expires_at,
    disabled_at,
    disabled_reason
  )
  values (
    v_uid,
    v_device_id,
    v_expo_push_token,
    v_platform,
    v_app_version,
    true,
    now(),
    now() + interval '30 days',
    null,
    null
  )
  on conflict (user_id, device_id) do update
  set expo_push_token = excluded.expo_push_token,
      platform = excluded.platform,
      app_version = excluded.app_version,
      enabled = true,
      last_seen_at = now(),
      expires_at = now() + interval '30 days',
      disabled_at = null,
      disabled_reason = null
  returning * into v_token;

  return v_token;
end;
$$;

revoke all on function public.register_push_token (text, text, text, text)
from public;

grant execute on function public.register_push_token (text, text, text, text)
to authenticated;

create
or replace function public.unregister_push_token (
  p_device_id text,
  p_expo_push_token text
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_device_id text := nullif(btrim(p_device_id), '');
  v_expo_push_token text := nullif(btrim(p_expo_push_token), '');
  v_disabled_count integer := 0;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  if v_device_id is null and v_expo_push_token is null then
    return 0;
  end if;

  update public.push_tokens
  set enabled = false,
      disabled_at = now(),
      disabled_reason = 'sign_out'
  where user_id = v_uid
    and enabled = true
    and (
      (v_device_id is not null and device_id = v_device_id)
      or (v_expo_push_token is not null and expo_push_token = v_expo_push_token)
    );

  get diagnostics v_disabled_count = row_count;
  return v_disabled_count;
end;
$$;

revoke all on function public.unregister_push_token (text, text)
from public;

grant execute on function public.unregister_push_token (text, text)
to authenticated;
