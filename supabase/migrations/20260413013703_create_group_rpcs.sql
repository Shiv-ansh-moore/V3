-- ============================================================================
-- create_group: creates a group and auto-joins the caller as a member.
-- Returns the new groups row (with generated invite_code).
-- ============================================================================
create
or replace function public.create_group () returns public.groups language plpgsql security definer
set
  search_path = public as $$
  declare
    v_group public.groups;
    v_uid uuid := auth.uid();
  begin
    if v_uid is null then
      raise exception 'authentication required';
    end if;

    insert into public.groups (created_by)
    values (v_uid)
    returning * into v_group;

    insert into public.group_members (group_id, user_id)
    values (v_group.id, v_uid);

    return v_group;
  end;
  $$;

grant
execute on function public.create_group () to authenticated;

-- ============================================================================
-- join_group: adds the caller to a group by invite code.
-- Normalises the code to uppercase so typing 'k7m9x2' matches 'K7M9X2'.
-- ============================================================================
create
or replace function public.join_group (p_invite_code text) returns public.groups language plpgsql security definer
set
  search_path = public as $$
  declare
    v_group public.groups;
    v_uid uuid := auth.uid();
  begin
    if v_uid is null then
      raise exception 'authentication required';
    end if;

    select * into v_group
    from public.groups
    where invite_code = upper(p_invite_code);

    if not found then
      raise exception 'invalid invite code';
    end if;

    begin
      insert into public.group_members (group_id, user_id)
      values (v_group.id, v_uid);
    exception
      when unique_violation then
        raise exception 'you are already in a group';
    end;

    return v_group;
  end;
  $$;

grant
execute on function public.join_group (text) to authenticated;
