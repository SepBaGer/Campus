insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'authoring-media',
  'authoring-media',
  true,
  52428800,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'application/pdf',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/webm'
  ]::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists authoring_media_staff_select on storage.objects;
create policy authoring_media_staff_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'authoring-media'
  and exists (
    select 1
    from identity.person_role as role
    where role.person_id = (select auth.uid())
      and role.role_code in ('teacher', 'admin', 'owner')
  )
);

drop policy if exists authoring_media_staff_insert on storage.objects;
create policy authoring_media_staff_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'authoring-media'
  and exists (
    select 1
    from identity.person_role as role
    where role.person_id = (select auth.uid())
      and role.role_code in ('teacher', 'admin', 'owner')
  )
);

drop policy if exists authoring_media_staff_update on storage.objects;
create policy authoring_media_staff_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'authoring-media'
  and exists (
    select 1
    from identity.person_role as role
    where role.person_id = (select auth.uid())
      and role.role_code in ('teacher', 'admin', 'owner')
  )
)
with check (
  bucket_id = 'authoring-media'
  and exists (
    select 1
    from identity.person_role as role
    where role.person_id = (select auth.uid())
      and role.role_code in ('teacher', 'admin', 'owner')
  )
);

drop policy if exists authoring_media_staff_delete on storage.objects;
create policy authoring_media_staff_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'authoring-media'
  and exists (
    select 1
    from identity.person_role as role
    where role.person_id = (select auth.uid())
      and role.role_code in ('teacher', 'admin', 'owner')
  )
);
