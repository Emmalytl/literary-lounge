-- Storage uploads use storage.objects and must be granted to the JWT role
-- explicitly. Keep this bucket private; signed URLs handle member reads.
insert into storage.buckets (id, name, public)
values ('book-content', 'book-content', false)
on conflict (id) do update set public = false;

drop policy if exists "book_content_staff_write" on storage.objects;
drop policy if exists "book_content_admin_insert" on storage.objects;
drop policy if exists "book_content_admin_update" on storage.objects;
drop policy if exists "book_content_staff_insert" on storage.objects;
drop policy if exists "book_content_staff_update" on storage.objects;

create policy "book_content_staff_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'book-content'
    and (select public.is_staff((select auth.uid())))
  );

create policy "book_content_staff_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'book-content'
    and (select public.is_staff((select auth.uid())))
  )
  with check (
    bucket_id = 'book-content'
    and (select public.is_staff((select auth.uid())))
  );