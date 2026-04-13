-- ============================================================================
-- groups: accountability groups users join via invite code
-- ============================================================================
create table
  public.groups (
    id uuid primary key default gen_random_uuid(),
    invite_code text not null unique,
    created_by uuid references public.profiles (id) on delete set null,
    created_at timestamptz not null default now()
  );

-- ============================================================================
-- Invite code generation: 6-char Crockford base32
-- Alphabet excludes I, L, O, U to avoid visual ambiguity
-- ============================================================================
create
or replace function public.generate_invite_code () returns text language plpgsql
set
  search_path = public as $$
  declare
    alphabet text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    code text := '';
    i int;
  begin
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    return code;
  end;
  $$;

-- Fill invite_code on insert, retrying on the (rare) unique collision
create
or replace function public.set_group_invite_code () returns trigger language plpgsql
set
  search_path = public as $$
  declare
    candidate text;
    attempts int := 0;
  begin
    if new.invite_code is null then
      loop
        candidate := public.generate_invite_code();
        perform 1 from public.groups where invite_code = candidate;
        if not found then
          new.invite_code := candidate;
          return new;
        end if;
        attempts := attempts + 1;
        if attempts >= 10 then
          raise exception 'could not generate unique invite code after 10 attempts';
        end if;
      end loop;
    end if;
    return new;
  end;
  $$;

create trigger groups_set_invite_code before insert on public.groups for each row
execute function public.set_group_invite_code ();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.groups enable row level security;

-- Creator can delete the group (cascades to memberships and future messages).
create policy "creator can delete group" on public.groups for delete to authenticated using (
  (
    select
      auth.uid ()
  ) = created_by
);

-- select policy for members is added in the create_group_members migration
-- (it depends on the group_members table existing via the is_group_member helper).
-- insert/update go through the create_group RPC — no direct-table policies.
