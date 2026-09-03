-- Allow staff to remove files when an admin deletes a book.
create policy "book_content_staff_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'book-content'
    and (select public.is_staff((select auth.uid())))
  );

create policy "book_covers_staff_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'book-covers'
    and (select public.is_staff((select auth.uid())))
  );