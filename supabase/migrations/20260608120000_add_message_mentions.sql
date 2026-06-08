-- Store parsed @mentions for chat text messages.
alter table public.messages
add column mention_entities jsonb not null default '[]'::jsonb,
add constraint messages_mention_entities_array
  check (jsonb_typeof(mention_entities) = 'array');
