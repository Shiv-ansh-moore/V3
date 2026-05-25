-- ============================================================================
-- goal decks: reusable user-owned sets of goal templates.
-- ============================================================================
create table
  public.goal_decks (
    id uuid primary key default gen_random_uuid (),
    user_id uuid not null references public.profiles (id) on delete cascade,
    title text not null,
    icon text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint goal_decks_title_not_blank check (length(btrim(title)) > 0),
    constraint goal_decks_icon_not_blank check (length(btrim(icon)) > 0)
  );

create index goal_decks_user_created on public.goal_decks (user_id, created_at desc);

create trigger goal_decks_set_updated_at before
update on public.goal_decks for each row
execute function public.set_updated_at ();

create table
  public.goal_deck_items (
    id uuid primary key default gen_random_uuid (),
    deck_id uuid not null references public.goal_decks (id) on delete cascade,
    title text not null,
    icon text not null,
    position int not null check (position >= 0),
    created_at timestamptz not null default now(),
    constraint goal_deck_items_title_not_blank check (length(btrim(title)) > 0),
    constraint goal_deck_items_icon_not_blank check (length(btrim(icon)) > 0),
    constraint goal_deck_items_deck_position_unique unique (deck_id, position)
  );

create index goal_deck_items_deck_position on public.goal_deck_items (deck_id, position);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.goal_decks enable row level security;

alter table public.goal_deck_items enable row level security;

create policy "view own goal decks" on public.goal_decks for
select
  to authenticated using (
    user_id = (
      select
        auth.uid ()
    )
  );

create policy "create own goal decks" on public.goal_decks for insert to authenticated
with
  check (
    user_id = (
      select
        auth.uid ()
    )
  );

create policy "update own goal decks" on public.goal_decks for
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

create policy "delete own goal decks" on public.goal_decks for delete to authenticated using (
  user_id = (
    select
      auth.uid ()
  )
);

create policy "view own goal deck items" on public.goal_deck_items for
select
  to authenticated using (
    exists (
      select
        1
      from
        public.goal_decks
      where
        goal_decks.id = goal_deck_items.deck_id
        and goal_decks.user_id = (
          select
            auth.uid ()
        )
    )
  );

create policy "create own goal deck items" on public.goal_deck_items for insert to authenticated
with
  check (
    exists (
      select
        1
      from
        public.goal_decks
      where
        goal_decks.id = goal_deck_items.deck_id
        and goal_decks.user_id = (
          select
            auth.uid ()
        )
    )
  );

create policy "update own goal deck items" on public.goal_deck_items for
update to authenticated using (
  exists (
    select
      1
    from
      public.goal_decks
    where
      goal_decks.id = goal_deck_items.deck_id
      and goal_decks.user_id = (
        select
          auth.uid ()
      )
  )
)
with
  check (
    exists (
      select
        1
      from
        public.goal_decks
      where
        goal_decks.id = goal_deck_items.deck_id
        and goal_decks.user_id = (
          select
            auth.uid ()
        )
    )
  );

create policy "delete own goal deck items" on public.goal_deck_items for delete to authenticated using (
  exists (
    select
      1
    from
      public.goal_decks
    where
      goal_decks.id = goal_deck_items.deck_id
      and goal_decks.user_id = (
        select
          auth.uid ()
      )
  )
);

-- ============================================================================
-- Atomic create/update helper for decks and ordered templates.
-- ============================================================================
create
or replace function public.save_goal_deck (
  p_deck_id uuid,
  p_title text,
  p_icon text,
  p_items jsonb
) returns public.goal_decks language plpgsql security definer
set
  search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_deck public.goal_decks;
  v_item jsonb;
  v_position int := 0;
  v_title text := btrim(coalesce(p_title, ''));
  v_icon text := btrim(coalesce(p_icon, ''));
  v_item_title text;
  v_item_icon text;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if v_title = '' then
    raise exception 'deck title is required';
  end if;

  if v_icon = '' then
    raise exception 'deck icon is required';
  end if;

  if coalesce(jsonb_typeof(p_items), '') <> 'array' then
    raise exception 'deck items must be an array';
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception 'deck must contain at least one goal';
  end if;

  if p_deck_id is null then
    insert into public.goal_decks (user_id, title, icon)
    values (v_user_id, v_title, v_icon)
    returning * into v_deck;
  else
    update public.goal_decks
      set title = v_title,
          icon = v_icon
      where id = p_deck_id
        and user_id = v_user_id
      returning * into v_deck;

    if not found then
      raise exception 'deck not found' using errcode = 'P0002';
    end if;

    delete from public.goal_deck_items
      where deck_id = p_deck_id;
  end if;

  for v_item in
    select value from jsonb_array_elements(p_items) as items(value)
  loop
    v_item_title := btrim(coalesce(v_item ->> 'title', ''));
    v_item_icon := btrim(coalesce(v_item ->> 'icon', ''));

    if v_item_title = '' then
      raise exception 'goal title is required';
    end if;

    if v_item_icon = '' then
      raise exception 'goal icon is required';
    end if;

    insert into public.goal_deck_items (deck_id, title, icon, position)
    values (v_deck.id, v_item_title, v_item_icon, v_position);

    v_position := v_position + 1;
  end loop;

  return v_deck;
end;
$$;

revoke all on function public.save_goal_deck (uuid, text, text, jsonb) from public;

grant execute on function public.save_goal_deck (uuid, text, text, jsonb) to authenticated;
