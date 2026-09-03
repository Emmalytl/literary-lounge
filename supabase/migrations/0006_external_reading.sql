-- External reading links and honest Literary Lounge activity tracking.
alter table books add column if not exists reading_url text;
alter table books add column if not exists reading_source text;
alter table books add column if not exists reading_type text not null default 'external_url';
alter table books add column if not exists is_current_book boolean not null default false;

alter table reading_progress add column if not exists last_opened_at timestamptz;

do $$
begin
  alter table books add constraint books_reading_type_check
    check (reading_type in ('external_url', 'hosted', 'future_epub', 'future_pdf'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table books add constraint books_reading_url_check
    check (reading_url is null or reading_url ~* '^https?://[^[:space:]]+$');
exception when duplicate_object then null;
end $$;

create unique index if not exists idx_one_current_book
  on books (is_current_book) where is_current_book = true;
create index if not exists idx_books_reading_type on books(reading_type);

create or replace function record_book_open(p_book_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid := auth.uid();
  v_book books%rowtype;
begin
  if v_member_id is null then
    raise exception 'You must be signed in to open a book';
  end if;

  select * into v_book from books
  where id = p_book_id and status = 'published';

  if not found then
    raise exception 'Book not found';
  end if;

  insert into reading_progress (member_id, book_id, status, started_at, last_opened_at, updated_at)
  values (v_member_id, p_book_id, 'reading', now(), now(), now())
  on conflict (member_id, book_id) do update set
    last_opened_at = now(),
    updated_at = now();

  perform award_points(v_member_id, 'book_opened', 1, 'books', p_book_id,
    'Opened ' || v_book.title);
end;
$$;

revoke all on function record_book_open(uuid) from public;
grant execute on function record_book_open(uuid) to authenticated;

create or replace function set_current_book(p_book_id uuid, p_is_current boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin(auth.uid()) then
    raise exception 'Only admins can change the current book';
  end if;

  if p_is_current then
    update books set is_current_book = false where is_current_book and id <> p_book_id;
  end if;
  update books set is_current_book = p_is_current, updated_at = now() where id = p_book_id;
end;
$$;

revoke all on function set_current_book(uuid, boolean) from public;
grant execute on function set_current_book(uuid, boolean) to authenticated;