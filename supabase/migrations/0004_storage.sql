-- =========================================================================
-- STORAGE BUCKETS
-- book-covers: PUBLIC (safe — covers are marketing images, not content)
-- book-content: PRIVATE (chapter text/files — access via signed URLs only)
-- avatars: PUBLIC (small profile photos)
-- receipts: PRIVATE (expense receipts, admin-only)
-- =========================================================================

insert into storage.buckets (id, name, public)
values
  ('book-covers', 'book-covers', true),
  ('book-content', 'book-content', false),
  ('avatars', 'avatars', true),
  ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- Public read for covers/avatars
create policy "covers_public_read" on storage.objects for select
  using (bucket_id = 'book-covers');
create policy "avatars_public_read" on storage.objects for select
  using (bucket_id = 'avatars');

-- Staff-only write for covers
create policy "covers_staff_write" on storage.objects for insert
  with check (bucket_id = 'book-covers' and is_staff(auth.uid()));

-- Members upload their own avatar into a folder named after their user id
create policy "avatars_own_write" on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- book-content: NO public/select policy at all. All reads happen through
-- a Supabase Edge Function that checks book_access then mints a short-lived
-- signed URL (see supabase/functions/get-chapter-url). Staff may upload.
create policy "book_content_staff_write" on storage.objects for insert
  with check (bucket_id = 'book-content' and is_staff(auth.uid()));

-- receipts: admin only
create policy "receipts_admin_all" on storage.objects for all
  using (bucket_id = 'receipts' and is_admin(auth.uid()))
  with check (bucket_id = 'receipts' and is_admin(auth.uid()));
