-- Send social push notifications immediately from row triggers instead of
-- queuing them for the notification batch cron worker.

create
or replace function public.handle_message_notification () returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.kind = 'text' and new.sender_id is not null then
    perform public.invoke_notification_edge_function(
      'send-social-notification',
      jsonb_build_object(
        'event_type', 'message',
        'message_id', new.id,
        'group_id', new.group_id,
        'actor_id', new.sender_id
      )
    );
  elsif new.kind = 'proof' and new.sender_id is not null then
    perform public.invoke_notification_edge_function(
      'send-social-notification',
      jsonb_build_object(
        'event_type', 'proof',
        'message_id', new.id,
        'group_id', new.group_id,
        'actor_id', new.sender_id,
        'proof_id', new.proof_id
      )
    );
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

create
or replace function public.handle_reaction_notification () returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message record;
begin
  select
    m.id,
    m.sender_id,
    m.group_id,
    m.kind
  into v_message
  from public.messages m
  where m.id = new.message_id;

  if not found
     or v_message.sender_id is null
     or v_message.sender_id = new.user_id
     or v_message.kind not in ('text', 'proof') then
    return new;
  end if;

  perform public.invoke_notification_edge_function(
    'send-social-notification',
    jsonb_build_object(
      'event_type', 'reaction',
      'message_id', new.message_id,
      'group_id', v_message.group_id,
      'actor_id', new.user_id,
      'emoji', new.emoji
    )
  );

  return new;
end;
$$;

do $$
begin
  if to_regclass('cron.job') is null then
    raise notice 'Skipping notification batch cron unschedule: pg_cron is not available';
    return;
  end if;

  begin
    perform cron.unschedule('send-notification-batches');
  exception
    when others then
      null;
  end;
exception
  when undefined_function or invalid_schema_name then
    raise notice 'Skipping notification batch cron unschedule: pg_cron is not available';
  when others then
    raise notice 'Notification batch cron unschedule failed: %', sqlerrm;
end $$;

drop function if exists public.invoke_notification_batch_sender ();
drop function if exists public.claim_due_notification_batches (int);

revoke all on function public.handle_message_notification () from public;
revoke all on function public.handle_reaction_notification () from public;
