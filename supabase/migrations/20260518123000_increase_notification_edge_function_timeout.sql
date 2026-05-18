-- Give local and production Edge Functions enough time to load, query, and send
-- Expo push tickets before pg_net marks the request timed out.
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
    using v_url, v_headers, p_body, 10000;
  exception
    when undefined_function or invalid_schema_name then
      raise notice 'Skipping notification Edge Function invocation: pg_net is not available';
    when others then
      raise notice 'Notification Edge Function invocation failed: %', sqlerrm;
  end;
end;
$$;

revoke all on function public.invoke_notification_edge_function (text, jsonb)
from public;
