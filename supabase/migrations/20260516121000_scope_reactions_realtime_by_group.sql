-- Add group_id directly to reactions so realtime can filter by active group.
alter table public.reactions add column if not exists group_id uuid;

update public.reactions r
set group_id = m.group_id
from public.messages m
where r.message_id = m.id
  and r.group_id is null;

alter table public.reactions alter column group_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reactions_group_id_fkey'
  ) then
    alter table public.reactions
      add constraint reactions_group_id_fkey
      foreign key (group_id)
      references public.groups (id)
      on delete cascade;
  end if;
end $$;

create index if not exists reactions_group_id_idx
on public.reactions (group_id);

create or replace function public.set_reaction_group_id ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
begin
  select m.group_id
  into v_group_id
  from public.messages m
  where m.id = new.message_id;

  if v_group_id is null then
    raise exception 'reaction message_id % does not reference an existing message', new.message_id;
  end if;

  if new.group_id is not null and new.group_id <> v_group_id then
    raise exception 'reaction group_id must match message group_id';
  end if;

  new.group_id := v_group_id;
  return new;
end;
$$;

drop trigger if exists reactions_set_group_id on public.reactions;

create trigger reactions_set_group_id
before insert or update of message_id, group_id on public.reactions
for each row
execute function public.set_reaction_group_id ();

drop policy if exists "view reactions" on public.reactions;
drop policy if exists "add reaction" on public.reactions;

create policy "view reactions" on public.reactions for
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

create policy "add reaction" on public.reactions for insert to authenticated
with
  check (
    user_id = (
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

-- Needed so realtime can apply group_id filters to DELETE events too.
alter table public.reactions replica identity full;
