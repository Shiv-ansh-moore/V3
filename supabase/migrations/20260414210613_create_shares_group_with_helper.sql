-- ============================================================================
-- shares_group_with: does the caller share a group with p_other_user_id?
--
-- Used by RLS policies on tables that should be visible to anyone in your
-- group (goals, proofs, messages, screen_events, ...).
--
-- security definer so it bypasses RLS on group_members when called from
-- another policy — prevents recursion.
--
-- When multi-group support ships, this still works unchanged: returns true
-- if ANY shared group exists between the caller and p_other_user_id.
-- ============================================================================
create or replace function public.shares_group_with (p_other_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members
    where user_id = p_other_user_id
      and group_id = (
        select group_id from public.group_members
        where user_id = (select auth.uid())
        limit 1
      )
  );
$$;

grant execute on function public.shares_group_with (uuid) to authenticated;
