-- ============================================================================
-- reactions: emoji reactions on messages.
--
-- Composite PK (message_id, user_id, emoji) enforces one-of-each-emoji per
-- user per message. Toggle = delete + re-insert; no UPDATE policy needed.
-- ============================================================================
create table
  public.reactions (
    message_id uuid not null references public.messages (id) on delete cascade,
    user_id uuid not null references public.profiles (id) on delete cascade,
    emoji text not null,
    created_at timestamptz not null default now(),
    primary key (message_id, user_id, emoji)
  );

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.reactions enable row level security;

-- Read: members of the message's group.
create policy "view reactions" on public.reactions for
select
  to authenticated using (
    public.is_group_member (
      (
        select
          m.group_id
        from
          public.messages m
        where
          m.id = message_id
      ),
      (
        select
          auth.uid ()
      )
    )
  );

-- Insert: you are the reactor and you're in the message's group.
create policy "add reaction" on public.reactions for insert to authenticated
with
  check (
    user_id = (
      select
        auth.uid ()
    )
    and public.is_group_member (
      (
        select
          m.group_id
        from
          public.messages m
        where
          m.id = message_id
      ),
      (
        select
          auth.uid ()
      )
    )
  );

-- Delete: remove your own reactions.
create policy "remove own reaction" on public.reactions for delete to authenticated using (
  user_id = (
    select
      auth.uid ()
  )
);

-- No UPDATE policy — reactions are immutable.
