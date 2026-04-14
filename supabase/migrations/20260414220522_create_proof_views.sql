-- ============================================================================
-- proof_views: per-viewer "seen" record for the story picker / avatar ring.
--
-- A row means "viewer_id has seen proof_id". Absence means unseen.
-- Write-once in MVP — no update/delete (no "mark as unread" feature).
--
-- The composite PK doubles as the index for "has this viewer seen proof X".
-- ============================================================================
create table public.proof_views (
  viewer_id uuid not null references public.profiles (id) on delete cascade,
  proof_id  uuid not null references public.proofs (id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (viewer_id, proof_id)
);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.proof_views enable row level security;

-- Read: only your own view records. No one else cares.
create policy "view own proof views" on public.proof_views for select to authenticated
using (viewer_id = (select auth.uid()));

-- Insert: only records for yourself. The proof_id existing at all means the
-- proofs SELECT policy already allowed you to see it, so no extra group check.
create policy "record own proof view" on public.proof_views for insert to authenticated
with check (viewer_id = (select auth.uid()));

-- No update/delete policies: views are write-once in MVP.
