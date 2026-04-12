-- ============================================================================                                                                                                             
-- profiles: per-user app data that extends auth.users                                                                                                                                      
-- ============================================================================
create table
  public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    username text unique,
    display_name text,
    avatar_url text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

-- Keep updated_at fresh on every row update
create
or replace function public.set_updated_at () returns trigger language plpgsql as $$                                                                                                                                                                                       
  begin                                  
    new.updated_at = now();
    return new;
  end;
  $$;

create trigger profiles_set_updated_at before
update on public.profiles for each row
execute function public.set_updated_at ();

-- Auto-create a profile row whenever a new auth user signs up                                                                                                                              
create
or replace function public.handle_new_user () returns trigger language plpgsql security definer
set
  search_path = public as $$
  begin
    insert into public.profiles (id) values (new.id);
    return new;                                                                                                                                                                               
  end;
  $$;

create trigger on_auth_user_created
after insert on auth.users for each row
execute function public.handle_new_user ();

-- ============================================================================
-- Row Level Security                                                                                                                                                                       
-- ============================================================================
alter table public.profiles enable row level security;

create policy "profiles are viewable by authenticated users" on public.profiles for
select
  to authenticated using (true);

create policy "users can update own profile" on public.profiles for
update to authenticated using (auth.uid () = id)
with
  check (auth.uid () = id);