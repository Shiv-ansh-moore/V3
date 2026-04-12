-- Pin search_path on set_updated_at to match Supabase's security linter.                                                                                                                   
-- `create or replace function` is idempotent — this redefines the function
-- with the added `set search_path = public` directive.                                                                                                                                     
create
or replace function public.set_updated_at () returns trigger language plpgsql
set
    search_path = public as $$                                                         
  begin                                                                                                                                                                                       
    new.updated_at = now();                                     
    return new;                                                                                                                                                                               
  end;                                                                                                                                                                                        
  $$;