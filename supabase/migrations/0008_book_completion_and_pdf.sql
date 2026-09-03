alter table books add column if not exists reading_file_path text;
alter table books add column if not exists audio_file_path text;

create or replace function record_book_completion(p_book_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_progress reading_progress%rowtype;
begin
  select * into v_progress from reading_progress
  where member_id = auth.uid() and book_id = p_book_id;

  if not found or coalesce(v_progress.percent_complete, 0) < 85 then
    raise exception 'Read at least 85 percent of this book before marking it completed';
  end if;

  update reading_progress
  set status = 'completed', completed_at = coalesce(completed_at, now()), updated_at = now()
  where id = v_progress.id;

  perform award_points(auth.uid(), 'book_completed', 10, 'books', p_book_id, 'Completed book');
end;
$$;

revoke all on function record_book_completion(uuid) from public;
grant execute on function record_book_completion(uuid) to authenticated;