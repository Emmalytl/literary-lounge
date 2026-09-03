insert into storage.buckets (id, name, public)
values ('book-content', 'book-content', false)
on conflict (id) do update set public = false;

do $$
begin
  create policy "book_content_admin_insert" on storage.objects for insert
    with check (bucket_id = 'book-content' and is_admin(auth.uid()));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "book_content_admin_update" on storage.objects for update
    using (bucket_id = 'book-content' and is_admin(auth.uid()))
    with check (bucket_id = 'book-content' and is_admin(auth.uid()));
exception when duplicate_object then null;
end $$;