-- ============================================================================
-- messages: unified feed for the social page.
--
-- kind values:
--   'text'   — user-typed chat message   (body not null)
--   'proof'  — goal completion card      (proof_id points to proofs)
--   'unlock' — session started           (session_id points to screen_sessions)
--   'lock'   — session ended early       (session_id points to screen_sessions)
--
-- Exactly one payload column matches the kind — enforced by CHECK.
-- Auto-locks (full window used) produce NO lock message; feed derives end-time
-- client-side from granted_seconds.
-- ============================================================================
create table
  public.messages (
    id uuid primary key default gen_random_uuid (),
    group_id uuid not null references public.groups (id) on delete cascade,
    sender_id uuid references public.profiles (id) on delete set null,
    kind text not null,
    body text,
    proof_id uuid references public.proofs (id) on delete cascade,
    session_id uuid references public.screen_sessions (id) on delete cascade,
    reply_to_id uuid references public.messages (id) on delete set null,
    created_at timestamptz not null default now(),
    constraint messages_kind_check check (kind in ('text', 'proof', 'unlock', 'lock')),
    constraint messages_payload_matches_kind check (
      (
        kind = 'text'
        and body is not null
        and proof_id is null
        and session_id is null
      )
      or (
        kind = 'proof'
        and body is null
        and proof_id is not null
        and session_id is null
      )
      or (
        kind in ('unlock', 'lock')
        and body is null
        and proof_id is null
        and session_id is not null
      )
    )
  );

-- Main feed query: group chat history, ordered by time.
create index messages_group_created on public.messages (group_id, created_at desc);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.messages enable row level security;

-- Read: members of the group.
create policy "view group messages" on public.messages for
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

-- Insert: you are the sender and you're in the group.
--
-- NOTE: this policy does NOT verify that referenced proof_id / session_id
-- rows belong to the sender. A malicious client could post a proof-kind
-- message pointing at another user's proof, causing "feed impersonation."
-- We accept this trust assumption for MVP simplicity — the client will
-- only ever reference its own rows. Tighten here if it becomes an issue:
-- add `exists (...)` sub-checks against proofs / screen_sessions by user_id.
create policy "post group message" on public.messages for insert to authenticated
with
  check (
    sender_id = (
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

-- Delete: only your own TEXT messages. Event messages (proof/unlock/lock)
-- are permanent — accountability history stays.
create policy "delete own text message" on public.messages for delete to authenticated using (
  sender_id = (
    select
      auth.uid ()
  )
  and kind = 'text'
);

-- No UPDATE policy — messages are immutable.