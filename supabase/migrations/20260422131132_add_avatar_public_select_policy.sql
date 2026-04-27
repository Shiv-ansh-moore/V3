-- ============================================================================
-- Allow uploaders to read their own avatar row
-- ============================================================================
-- The avatars bucket has `public = true`, so files are reachable by their
-- public HTTP URL without RLS. But storage.objects has RLS enabled, and the
-- uploader's own `INSERT ... RETURNING *` / upsert conflict-check are
-- DB-level reads — they go through SELECT RLS, not the public URL.
--
-- Without a SELECT policy, those reads return zero rows and the upload
-- appears to fail. This policy lets an authenticated user see only their
-- own avatar row (folder = their uid), matching the INSERT policy.
create policy "users can read their own avatar" on storage.objects for
select
    to authenticated using (bucket_id = 'avatars');