-- ============================================================================
-- get_group_recent_proofs: story viewer source for recent group proofs.
--
-- Returns proofs from the last 24 hours for members of the supplied group.
-- The caller must be a member of that group.
-- ============================================================================
create
or replace function public.get_group_recent_proofs (p_group_id uuid) returns table (
  proof_id uuid,
  user_id uuid,
  message_id uuid,
  goal_id uuid,
  goal_title text,
  caption text,
  image_path text,
  submitted_at timestamptz,
  viewed_by_me boolean
) language sql stable
set
  search_path = public as $$
  select
    p.id as proof_id,
    p.user_id,
    m.id as message_id,
    p.goal_id,
    g.title as goal_title,
    p.caption,
    p.image_path,
    p.submitted_at,
    exists (
      select 1
      from public.proof_views pv
      where pv.proof_id = p.id
        and pv.viewer_id = auth.uid()
    ) as viewed_by_me
  from public.group_members gm
  join public.proofs p
    on p.user_id = gm.user_id
  join public.goals g
    on g.id = p.goal_id
  left join public.messages m
    on m.proof_id = p.id
    and m.group_id = p_group_id
    and m.kind = 'proof'
  where gm.group_id = p_group_id
    and public.is_group_member(p_group_id, auth.uid())
    and p.submitted_at >= now() - interval '24 hours'
  order by p.user_id, p.submitted_at asc;
$$;

grant execute on function public.get_group_recent_proofs (uuid) to authenticated;
