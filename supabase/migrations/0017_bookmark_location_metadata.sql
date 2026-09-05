alter table bookmarks
  add column if not exists chapter_label text;

alter table bookmarks
  add column if not exists page_number integer;