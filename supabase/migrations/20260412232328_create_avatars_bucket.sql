-- ============================================================================                                                                                                             
-- avatars storage bucket — profile pictures                                                                                                                                                
-- ============================================================================
-- Create the bucket. `public = true` means files are readable by anyone with the URL.                                                                                                      
-- (Write access is still gated by policies below.)                                                                                                                                         
insert into
  storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true) on conflict (id)
do nothing;

-- ============================================================================
-- Policies on storage.objects — who can upload/update/delete                                                                                                                               
-- ============================================================================
-- Anyone can read (the bucket is public, but we still need an explicit select                                                                                                              
-- policy because RLS is on for storage.objects by default).                                                                                                                                
create policy "avatar images are publicly accessible" on storage.objects for
select
  using (bucket_id = 'avatars');

-- Users can upload a file only under their own user-id folder.                                                                                                                             
create policy "users can upload their own avatar" on storage.objects for insert to authenticated
with
  check (
    bucket_id = 'avatars'
    and (storage.foldername (name)) [1] = auth.uid ()::text
  );

-- Users can overwrite their own avatar.                                                                                                                                                    
create policy "users can update their own avatar" on storage.objects for
update to authenticated using (
  bucket_id = 'avatars'
  and (storage.foldername (name)) [1] = auth.uid ()::text
)
with
  check (
    bucket_id = 'avatars'
    and (storage.foldername (name)) [1] = auth.uid ()::text
  );

-- Users can delete their own avatar.                                                                                                                                                       
create policy "users can delete their own avatar" on storage.objects for delete to authenticated using (
  bucket_id = 'avatars'
  and (storage.foldername (name)) [1] = auth.uid ()::text
);