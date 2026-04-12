-- Wrap auth.uid() in (select ...) so it evaluates once per query, not per row.
-- Significant perf improvement at scale; no behaviour change.
-- profiles update                              
alter policy "users can update own profile" on public.profiles using (
    (
        select
            auth.uid ()
    ) = id
)
with
    check (
        (
            select
                auth.uid ()
        ) = id
    );

-- storage.objects — avatar insert                            
alter policy "users can upload their own avatar" on storage.objects
with
    check (
        bucket_id = 'avatars'
        and (storage.foldername (name)) [1] = (
            select
                auth.uid ()
        )::text
    );

-- storage.objects — avatar update                                                                                                                                                          
alter policy "users can update their own avatar" on storage.objects using (
    bucket_id = 'avatars'
    and (storage.foldername (name)) [1] = (
        select
            auth.uid ()
    )::text
)
with
    check (
        bucket_id = 'avatars'
        and (storage.foldername (name)) [1] = (
            select
                auth.uid ()
        )::text
    );

-- storage.objects — avatar delete                                                                                                                                                          
alter policy "users can delete their own avatar" on storage.objects using (
    bucket_id = 'avatars'
    and (storage.foldername (name)) [1] = (
        select
            auth.uid ()
    )::text
);