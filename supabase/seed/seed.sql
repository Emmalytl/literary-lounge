-- =========================================================================
-- SEED / DEMO DATA
-- Safe to run against a fresh dev project. Does NOT create real payments
-- or a real WhatsApp group -- the URL below is a clearly-marked placeholder.
-- =========================================================================

insert into categories (name, slug, description) values
  ('Classics', 'classics', 'Enduring works that shaped literature'),
  ('African Literature', 'african-literature', 'Voices and stories from across Africa'),
  ('Young Adult', 'young-adult', 'Coming-of-age and YA fiction'),
  ('Recommended', 'recommended', 'Curated Lounge picks')
on conflict (slug) do nothing;

insert into membership_plans (name, monthly_amount, currency, effective_from, is_active)
values ('Standard Membership', 100.00, 'GHS', '2027-01-01', true)
on conflict do nothing;

insert into badges (code, name, description, icon) values
  ('first_step', 'First Step', 'Complete your first book', 'footprints'),
  ('bookworm', 'Bookworm', 'Complete 5 books', 'bug'),
  ('page_turner', 'Page Turner', 'Complete 10 books', 'book-open'),
  ('voice_of_lounge', 'Voice of the Lounge', 'Participate in 25 discussions', 'message-circle'),
  ('world_reader', 'World Reader', 'Read books from multiple countries', 'globe'),
  ('african_voices', 'African Voices', 'Complete the African literature challenge', 'sparkles'),
  ('lounge_veteran', 'Lounge Veteran', 'Active for 12 months', 'shield'),
  ('lounge_legend', 'Lounge Legend', 'Major lifetime activity milestone', 'crown'),
  ('founding_member_2026', 'Founding Member -- 2026', 'Joined during the founding period', 'star')
on conflict (code) do nothing;

-- Demo book: White Fang (public domain -- Jack London, d. 1916).
-- Replace chapter storage_path values with real uploaded files under the
-- private "book-content" bucket; the text below is placeholder only.
insert into books (title, author, description, genre, publication_year,
                    chapter_count, is_public_domain, status, requires_access_grant)
values (
  'White Fang', 'Jack London',
  'A wild wolf-dog''s journey from the wilderness of the Yukon to domestication -- the Lounge''s first read.',
  'Classic Adventure', 1906, 25, true, 'published', false
)
on conflict do nothing;

-- DEMO event -- clearly marked as demo content.
insert into events (title, event_type, description, starts_at, whatsapp_url, status)
select
  '[DEMO] White Fang -- Opening Chapters Discussion',
  'Book Discussion',
  'Demo event for local testing. Replace whatsapp_url with your real group invite before going live.',
  now() + interval '7 days',
  'https://chat.whatsapp.com/REPLACE_WITH_REAL_INVITE',
  'scheduled'
where not exists (select 1 from events where title like '[DEMO]%');
