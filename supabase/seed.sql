begin;

create extension if not exists pgcrypto;

do $seed$
begin

create temporary table seed_demo_users (
  id uuid primary key,
  identity_id uuid not null unique,
  email text not null unique,
  username text not null unique,
  display_name text not null,
  joined_offset interval not null
) on commit drop;

insert into seed_demo_users (
  id,
  identity_id,
  email,
  username,
  display_name,
  joined_offset
)
values
  (
    '00000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-000000000201',
    'ava.demo@example.test',
    'ava_demo',
    'Ava',
    interval '6 days'
  ),
  (
    '00000000-0000-4000-8000-000000000102',
    '00000000-0000-4000-8000-000000000202',
    'ben.demo@example.test',
    'ben_demo',
    'Ben',
    interval '5 days 18 hours'
  ),
  (
    '00000000-0000-4000-8000-000000000103',
    '00000000-0000-4000-8000-000000000203',
    'maya.demo@example.test',
    'maya_demo',
    'Maya',
    interval '5 days 8 hours'
  ),
  (
    '00000000-0000-4000-8000-000000000104',
    '00000000-0000-4000-8000-000000000204',
    'leo.demo@example.test',
    'leo_demo',
    'Leo',
    interval '4 days 20 hours'
  );

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  phone_change,
  phone_change_token,
  email_change_token_current,
  reauthentication_token,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  is_sso_user,
  is_anonymous
)
select
  '00000000-0000-0000-0000-000000000000',
  id,
  'authenticated',
  'authenticated',
  email,
  crypt('demo123456', gen_salt('bf')),
  now(),
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  jsonb_build_object(
    'sub',
    id::text,
    'email',
    email,
    'email_verified',
    true,
    'phone_verified',
    false
  ),
  now() - joined_offset,
  now(),
  false,
  false
from seed_demo_users
on conflict (id) do update
set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  confirmation_token = excluded.confirmation_token,
  recovery_token = excluded.recovery_token,
  email_change_token_new = excluded.email_change_token_new,
  email_change = excluded.email_change,
  phone_change = excluded.phone_change,
  phone_change_token = excluded.phone_change_token,
  email_change_token_current = excluded.email_change_token_current,
  reauthentication_token = excluded.reauthentication_token,
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = now();

insert into auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  identity_id,
  id::text,
  id,
  jsonb_build_object(
    'sub',
    id::text,
    'email',
    email,
    'email_verified',
    false,
    'phone_verified',
    false
  ),
  'email',
  now(),
  now() - joined_offset,
  now()
from seed_demo_users
on conflict (provider_id, provider) do update
set
  user_id = excluded.user_id,
  identity_data = excluded.identity_data,
  updated_at = now();

insert into public.profiles (
  id,
  username,
  display_name,
  avatar_url,
  created_at,
  updated_at
)
select
  id,
  username,
  display_name,
  null,
  now() - joined_offset,
  now()
from seed_demo_users
on conflict (id) do update
set
  username = excluded.username,
  display_name = excluded.display_name,
  avatar_url = excluded.avatar_url,
  updated_at = now();

insert into public.groups (id, invite_code, created_by, created_at)
select
  '00000000-0000-4000-8000-000000000901',
  'DEMO01',
  (select id from seed_demo_users order by username limit 1),
  now() - interval '7 days'
where not exists (select 1 from public.groups)
on conflict (id) do nothing;

create temporary table seed_target_group (
  id uuid primary key
) on commit drop;

insert into seed_target_group (id)
select g.id
from public.groups g
order by
  exists (
    select 1
    from public.group_members gm
    where gm.group_id = g.id
      and not exists (
        select 1
        from seed_demo_users du
        where du.id = gm.user_id
      )
  ) desc,
  g.created_at
limit 1;

update public.group_members gm
set
  group_id = target.id,
  joined_at = now() - du.joined_offset
from seed_demo_users du
cross join seed_target_group target
where gm.user_id = du.id;

insert into public.group_members (group_id, user_id, joined_at)
select
  target.id,
  du.id,
  now() - du.joined_offset
from seed_demo_users du
cross join seed_target_group target
where not exists (
  select 1
  from public.group_members gm
  where gm.user_id = du.id
);

create temporary table seed_goals (
  id uuid primary key,
  user_id uuid not null,
  title text not null,
  icon text not null,
  duration text,
  status text not null,
  created_at timestamptz not null
) on commit drop;

insert into seed_goals (
  id,
  user_id,
  title,
  icon,
  duration,
  status,
  created_at
)
values
  (
    '00000000-0000-4000-8000-000000001101',
    '00000000-0000-4000-8000-000000000101',
    'Morning run',
    'PersonSimpleRunIcon',
    '30 min',
    'active',
    now() - interval '2 days 6 hours'
  ),
  (
    '00000000-0000-4000-8000-000000001102',
    '00000000-0000-4000-8000-000000000101',
    'Read 20 pages',
    'BookOpenIcon',
    '20 min',
    'active',
    now() - interval '2 days 5 hours'
  ),
  (
    '00000000-0000-4000-8000-000000001103',
    '00000000-0000-4000-8000-000000000101',
    'Phone-free lunch',
    'ForkKnifeIcon',
    null,
    'active',
    now() - interval '2 days 4 hours'
  ),
  (
    '00000000-0000-4000-8000-000000001104',
    '00000000-0000-4000-8000-000000000101',
    'Sunrise walk',
    'PersonSimpleWalkIcon',
    '25 min',
    'done',
    now() - interval '1 day 5 hours'
  ),
  (
    '00000000-0000-4000-8000-000000001201',
    '00000000-0000-4000-8000-000000000102',
    'Gym session',
    'BarbellIcon',
    '45 min',
    'active',
    now() - interval '2 days 3 hours'
  ),
  (
    '00000000-0000-4000-8000-000000001202',
    '00000000-0000-4000-8000-000000000102',
    'Meal prep',
    'BowlFoodIcon',
    '40 min',
    'active',
    now() - interval '2 days 2 hours'
  ),
  (
    '00000000-0000-4000-8000-000000001203',
    '00000000-0000-4000-8000-000000000102',
    'Budget check',
    'WalletIcon',
    '15 min',
    'active',
    now() - interval '2 days 1 hour'
  ),
  (
    '00000000-0000-4000-8000-000000001204',
    '00000000-0000-4000-8000-000000000102',
    'Packed lunch',
    'BowlFoodIcon',
    null,
    'done',
    now() - interval '1 day 4 hours'
  ),
  (
    '00000000-0000-4000-8000-000000001301',
    '00000000-0000-4000-8000-000000000103',
    'Study notes',
    'NotebookIcon',
    '30 min',
    'active',
    now() - interval '2 days'
  ),
  (
    '00000000-0000-4000-8000-000000001302',
    '00000000-0000-4000-8000-000000000103',
    'Yoga stretch',
    'FlowerLotusIcon',
    '20 min',
    'active',
    now() - interval '1 day 23 hours'
  ),
  (
    '00000000-0000-4000-8000-000000001303',
    '00000000-0000-4000-8000-000000000103',
    'Water bottle',
    'DropIcon',
    null,
    'active',
    now() - interval '1 day 22 hours'
  ),
  (
    '00000000-0000-4000-8000-000000001304',
    '00000000-0000-4000-8000-000000000103',
    'Inbox zero',
    'ClipboardTextIcon',
    '15 min',
    'done',
    now() - interval '1 day 3 hours'
  ),
  (
    '00000000-0000-4000-8000-000000001401',
    '00000000-0000-4000-8000-000000000104',
    'Guitar practice',
    'GuitarIcon',
    '30 min',
    'active',
    now() - interval '1 day 21 hours'
  ),
  (
    '00000000-0000-4000-8000-000000001402',
    '00000000-0000-4000-8000-000000000104',
    'Desk reset',
    'BroomIcon',
    '10 min',
    'active',
    now() - interval '1 day 20 hours'
  ),
  (
    '00000000-0000-4000-8000-000000001403',
    '00000000-0000-4000-8000-000000000104',
    'Evening walk',
    'PersonSimpleWalkIcon',
    '25 min',
    'active',
    now() - interval '1 day 19 hours'
  ),
  (
    '00000000-0000-4000-8000-000000001404',
    '00000000-0000-4000-8000-000000000104',
    'Stretch session',
    'FlowerLotusIcon',
    '15 min',
    'done',
    now() - interval '1 day 2 hours'
  );

insert into public.goals (
  id,
  user_id,
  title,
  icon,
  duration,
  status,
  created_at,
  archived_at,
  deleted_at
)
select
  id,
  user_id,
  title,
  icon,
  duration,
  status,
  created_at,
  null,
  null
from seed_goals
on conflict (id) do update
set
  title = excluded.title,
  icon = excluded.icon,
  duration = excluded.duration,
  status = excluded.status,
  archived_at = null,
  deleted_at = null;

create temporary table seed_proofs (
  id uuid primary key,
  goal_id uuid not null,
  user_id uuid not null,
  image_path text not null,
  caption text,
  submitted_at timestamptz not null
) on commit drop;

insert into seed_proofs (
  id,
  goal_id,
  user_id,
  image_path,
  caption,
  submitted_at
)
values
  (
    '00000000-0000-4000-8000-000000002101',
    '00000000-0000-4000-8000-000000001104',
    '00000000-0000-4000-8000-000000000101',
    'demo/ava-sunrise-walk.jpg',
    'Got outside before checking my phone.',
    now() - interval '3 hours'
  ),
  (
    '00000000-0000-4000-8000-000000002102',
    '00000000-0000-4000-8000-000000001204',
    '00000000-0000-4000-8000-000000000102',
    'demo/ben-packed-lunch.jpg',
    'No takeaway today.',
    now() - interval '2 hours 20 minutes'
  ),
  (
    '00000000-0000-4000-8000-000000002103',
    '00000000-0000-4000-8000-000000001304',
    '00000000-0000-4000-8000-000000000103',
    'demo/maya-inbox-zero.jpg',
    'Cleared the scary emails.',
    now() - interval '1 hour 25 minutes'
  ),
  (
    '00000000-0000-4000-8000-000000002104',
    '00000000-0000-4000-8000-000000001404',
    '00000000-0000-4000-8000-000000000104',
    'demo/leo-stretch-session.jpg',
    'Done before dinner.',
    now() - interval '35 minutes'
  );

insert into public.proofs (
  id,
  goal_id,
  user_id,
  image_path,
  caption,
  submitted_at
)
select
  id,
  goal_id,
  user_id,
  image_path,
  caption,
  submitted_at
from seed_proofs
on conflict (id) do update
set
  image_path = excluded.image_path,
  caption = excluded.caption,
  submitted_at = excluded.submitted_at;

insert into public.messages (
  group_id,
  sender_id,
  kind,
  proof_id,
  created_at
)
select
  target.id,
  proof.user_id,
  'proof',
  proof.id,
  proof.submitted_at
from seed_proofs proof
cross join seed_target_group target
where not exists (
  select 1
  from public.messages message
  where message.group_id = target.id
    and message.kind = 'proof'
    and message.proof_id = proof.id
);

create temporary table seed_messages (
  id uuid primary key,
  sender_id uuid not null,
  body text not null,
  reply_to_id uuid,
  created_at timestamptz not null
) on commit drop;

insert into seed_messages (
  id,
  sender_id,
  body,
  reply_to_id,
  created_at
)
values
  (
    '00000000-0000-4000-8000-000000003101',
    '00000000-0000-4000-8000-000000000101',
    'I am blocking TikTok until lunch today.',
    null,
    now() - interval '5 hours'
  ),
  (
    '00000000-0000-4000-8000-000000003102',
    '00000000-0000-4000-8000-000000000102',
    'Gym is booked for 6. Hold me to it.',
    null,
    now() - interval '4 hours 45 minutes'
  ),
  (
    '00000000-0000-4000-8000-000000003103',
    '00000000-0000-4000-8000-000000000103',
    'Doing a 30 minute notes sprint now.',
    null,
    now() - interval '4 hours 20 minutes'
  ),
  (
    '00000000-0000-4000-8000-000000003104',
    '00000000-0000-4000-8000-000000000104',
    'Guitar practice is on the board.',
    null,
    now() - interval '4 hours'
  ),
  (
    '00000000-0000-4000-8000-000000003105',
    '00000000-0000-4000-8000-000000000101',
    'Send a clip when you finish it.',
    '00000000-0000-4000-8000-000000003104',
    now() - interval '3 hours 55 minutes'
  ),
  (
    '00000000-0000-4000-8000-000000003106',
    '00000000-0000-4000-8000-000000000102',
    'No doom scrolling after 9pm. Calling it now.',
    null,
    now() - interval '55 minutes'
  );

insert into public.messages (
  id,
  group_id,
  sender_id,
  kind,
  body,
  reply_to_id,
  created_at
)
select
  message.id,
  target.id,
  message.sender_id,
  'text',
  message.body,
  message.reply_to_id,
  message.created_at
from seed_messages message
cross join seed_target_group target
on conflict (id) do update
set
  group_id = excluded.group_id,
  sender_id = excluded.sender_id,
  body = excluded.body,
  reply_to_id = excluded.reply_to_id,
  created_at = excluded.created_at;

create temporary table seed_screen_sessions (
  id uuid primary key,
  user_id uuid not null,
  app_name text not null,
  app_icon text,
  reason text,
  granted_seconds int not null,
  actual_seconds int,
  started_at timestamptz not null
) on commit drop;

insert into seed_screen_sessions (
  id,
  user_id,
  app_name,
  app_icon,
  reason,
  granted_seconds,
  actual_seconds,
  started_at
)
values
  (
    '00000000-0000-4000-8000-000000004101',
    '00000000-0000-4000-8000-000000000101',
    'Instagram',
    null,
    'Reply to a DM',
    600,
    420,
    now() - interval '3 hours 30 minutes'
  ),
  (
    '00000000-0000-4000-8000-000000004102',
    '00000000-0000-4000-8000-000000000102',
    'YouTube',
    null,
    'Watch a tutorial',
    900,
    null,
    now() - interval '2 hours 45 minutes'
  ),
  (
    '00000000-0000-4000-8000-000000004103',
    '00000000-0000-4000-8000-000000000103',
    'Apps',
    null,
    'Bank transfer',
    300,
    180,
    now() - interval '1 hour 45 minutes'
  );

insert into public.screen_sessions (
  id,
  user_id,
  app_name,
  app_icon,
  reason,
  granted_seconds,
  actual_seconds,
  started_at
)
select
  id,
  user_id,
  app_name,
  app_icon,
  reason,
  granted_seconds,
  actual_seconds,
  started_at
from seed_screen_sessions
on conflict (id) do nothing;

create temporary table seed_screen_messages (
  id uuid primary key,
  session_id uuid not null,
  sender_id uuid not null,
  kind text not null,
  created_at timestamptz not null
) on commit drop;

insert into seed_screen_messages (
  id,
  session_id,
  sender_id,
  kind,
  created_at
)
select
  '00000000-0000-4000-8000-000000005101'::uuid,
  id,
  user_id,
  'unlock',
  started_at
from seed_screen_sessions
where id = '00000000-0000-4000-8000-000000004101'
union all
select
  '00000000-0000-4000-8000-000000005103'::uuid,
  id,
  user_id,
  'unlock',
  started_at
from seed_screen_sessions
where id = '00000000-0000-4000-8000-000000004102'
union all
select
  '00000000-0000-4000-8000-000000005105'::uuid,
  id,
  user_id,
  'unlock',
  started_at
from seed_screen_sessions
where id = '00000000-0000-4000-8000-000000004103';

insert into public.messages (
  id,
  group_id,
  sender_id,
  kind,
  session_id,
  created_at
)
select
  event.id,
  target.id,
  event.sender_id,
  event.kind,
  event.session_id,
  event.created_at
from seed_screen_messages event
cross join seed_target_group target
where not exists (
  select 1
  from public.messages message
  where message.group_id = target.id
    and message.kind = event.kind
    and message.session_id = event.session_id
);

create temporary table seed_app_owner (
  id uuid primary key
) on commit drop;

insert into seed_app_owner (id)
select coalesce(
  (
    select gm.user_id
    from public.group_members gm
    where gm.group_id = target.id
      and not exists (
        select 1
        from seed_demo_users du
        where du.id = gm.user_id
      )
    order by gm.joined_at
    limit 1
  ),
  (select id from seed_demo_users order by username limit 1)
)
from seed_target_group target;

insert into public.goal_decks (
  id,
  user_id,
  title,
  icon,
  created_at,
  updated_at
)
select
  deck.id,
  owner.id,
  deck.title,
  deck.icon,
  deck.created_at,
  now()
from (
  values
    (
      '00000000-0000-4000-8000-000000006101'::uuid,
      'Morning Reset',
      'SunIcon',
      now() - interval '2 days'
    ),
    (
      '00000000-0000-4000-8000-000000006102'::uuid,
      'Deep Work',
      'BrainIcon',
      now() - interval '1 day'
    )
) as deck(id, title, icon, created_at)
cross join seed_app_owner owner
on conflict (id) do update
set
  user_id = excluded.user_id,
  title = excluded.title,
  icon = excluded.icon,
  updated_at = now();

delete from public.goal_deck_items
where deck_id in (
  '00000000-0000-4000-8000-000000006101',
  '00000000-0000-4000-8000-000000006102'
);

insert into public.goal_deck_items (
  id,
  deck_id,
  title,
  icon,
  position,
  created_at
)
values
  (
    '00000000-0000-4000-8000-000000006201',
    '00000000-0000-4000-8000-000000006101',
    'Make bed',
    'BedIcon',
    0,
    now() - interval '2 days'
  ),
  (
    '00000000-0000-4000-8000-000000006202',
    '00000000-0000-4000-8000-000000006101',
    'Drink water',
    'DropIcon',
    1,
    now() - interval '2 days'
  ),
  (
    '00000000-0000-4000-8000-000000006203',
    '00000000-0000-4000-8000-000000006101',
    'Walk outside',
    'PersonSimpleWalkIcon',
    2,
    now() - interval '2 days'
  ),
  (
    '00000000-0000-4000-8000-000000006204',
    '00000000-0000-4000-8000-000000006102',
    'Clear desk',
    'BroomIcon',
    0,
    now() - interval '1 day'
  ),
  (
    '00000000-0000-4000-8000-000000006205',
    '00000000-0000-4000-8000-000000006102',
    'Focus block',
    'BrainIcon',
    1,
    now() - interval '1 day'
  ),
  (
    '00000000-0000-4000-8000-000000006206',
    '00000000-0000-4000-8000-000000006102',
    'Review notes',
    'NotebookIcon',
    2,
    now() - interval '1 day'
  );

create temporary table seed_reactions (
  message_id uuid not null,
  user_id uuid not null,
  emoji text not null
) on commit drop;

insert into seed_reactions (message_id, user_id, emoji)
values
  (
    '00000000-0000-4000-8000-000000003101',
    '00000000-0000-4000-8000-000000000102',
    '🔥'
  ),
  (
    '00000000-0000-4000-8000-000000003102',
    '00000000-0000-4000-8000-000000000101',
    '💪'
  ),
  (
    '00000000-0000-4000-8000-000000003103',
    '00000000-0000-4000-8000-000000000104',
    '👏'
  ),
  (
    '00000000-0000-4000-8000-000000003106',
    '00000000-0000-4000-8000-000000000103',
    '🫡'
  ),
  (
    '00000000-0000-4000-8000-000000005101',
    '00000000-0000-4000-8000-000000000103',
    '👏'
  ),
  (
    '00000000-0000-4000-8000-000000005103',
    '00000000-0000-4000-8000-000000000101',
    '🔥'
  );

insert into seed_reactions (message_id, user_id, emoji)
select
  message.id,
  reactor.id,
  reaction.emoji
from seed_proofs proof
join public.messages message
  on message.proof_id = proof.id
  and message.kind = 'proof'
cross join lateral (
  values
    ('00000000-0000-4000-8000-000000000101'::uuid, '👏'),
    ('00000000-0000-4000-8000-000000000102'::uuid, '🔥')
) as reaction(user_id, emoji)
join seed_demo_users reactor
  on reactor.id = reaction.user_id
where reaction.user_id <> proof.user_id;

insert into public.reactions (
  message_id,
  group_id,
  user_id,
  emoji,
  created_at
)
select
  reaction.message_id,
  target.id,
  reaction.user_id,
  reaction.emoji,
  now()
from seed_reactions reaction
cross join seed_target_group target
on conflict (message_id, user_id, emoji) do nothing;

end
$seed$;

commit;
