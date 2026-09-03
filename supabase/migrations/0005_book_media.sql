-- Optional links to the ebook and audio editions of a book.
alter table books
  add column if not exists ebook_url text,
  add column if not exists audio_url text;