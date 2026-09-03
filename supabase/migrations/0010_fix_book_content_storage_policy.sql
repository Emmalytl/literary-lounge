-- Keep book and audio files private while allowing the same staff roles
-- that can access the admin book screen to upload and replace them.
drop policy if exists "book_content_staff_write" on storage.objects;
drop policy if exists "book_content_admin_insert" on storage.objects;
drop policy if exists "book_content_admin_update" on storage.objects;

create policy "book_content_staff_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'book-content' and is_staff(auth.uid()));

create policy "book_content_staff_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'book-content' and is_staff(auth.uid()))
  with check (bucket_id = 'book-content' and is_staff(auth.uid()));