-- ============================================================================
-- Fix: remove shadowed/unused `i` variable in generate_invite_code().
--
-- The outer `declare i int;` was shadowed by the FOR loop's auto-declared
-- loop variable and never used. db lint flagged both warnings.
-- ============================================================================
create or replace function public.generate_invite_code ()
returns text
language plpgsql
set search_path = public
as $$
  declare
    alphabet text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    code text := '';
  begin
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    return code;
  end;
$$;
