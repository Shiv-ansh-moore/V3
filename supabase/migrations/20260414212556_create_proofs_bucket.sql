-- ============================================================================
-- proofs storage bucket — goal completion photos (and later, videos/timelapses).
--
-- Private: reads gated by storage RLS mirroring the proofs table (group
-- members only). No public URLs.
--
-- Path convention: {user_id}/{proof_id}.{ext}
-- ============================================================================
insert into
  storage.buckets (id, name, public)
values
  ('proofs', 'proofs', false) on conflict (id)
do nothing;

-- ============================================================================
-- Policies on storage.objects
-- ============================================================================
-- Read: your own files, or a group-mate's.
create policy "view proofs in your group" on storage.objects for
select
  to authenticated using (
    bucket_id = 'proofs'
    and (
      (storage.foldername (name)) [1] = (
        select
          auth.uid ()
      )::text
      or public.shares_group_with (((storage.foldername (name)) [1])::uuid)
    )
  );

-- Upload: only under your own folder.
create policy "users can upload their own proofs" on storage.objects for insert to authenticated
with
  check (
    bucket_id = 'proofs'
    and (storage.foldername (name)) [1] = (
      select
        auth.uid ()
    )::text
  );

-- Delete: only your own files.
create policy "users can delete their own proofs" on storage.objects for delete to authenticated using (
  bucket_id = 'proofs'
  and (storage.foldername (name)) [1] = (
    select
      auth.uid ()
  )::text
);

-- No UPDATE policy: proofs are immutable once uploaded. Matches table design.