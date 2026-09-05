create table if not exists reading_highlights (
  id uuid primary key default uuid_generate_v4(),
  member_id uuid not null references profiles(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,
  chapter_id uuid references book_chapters(id) on delete cascade,
  location text not null,
  selected_text text not null,
  color text not null default '#F6D365',
  created_at timestamptz not null default now()
);

alter table reading_highlights enable row level security;

drop policy if exists "reading_highlights_own" on reading_highlights;
create policy "reading_highlights_own" on reading_highlights for all
  using (member_id = auth.uid())
  with check (member_id = auth.uid());

create index if not exists idx_highlights_member_book
  on reading_highlights(member_id, book_id);