-- =========================================================================
-- THE LITERARY LOUNGE — Core Schema
-- Run in order: 0001_schema.sql -> 0002_rls.sql -> 0003_functions.sql
-- Idempotent: safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE)
-- =========================================================================

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- -------------------------------------------------------------------------
-- ROLES & PROFILES
-- -------------------------------------------------------------------------
do $$ begin
  create type member_role as enum ('member', 'moderator', 'librarian', 'admin');
exception when duplicate_object then null; end $$;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  bio text,
  avatar_url text,
  role member_role not null default 'member',
  is_active boolean not null default true,
  founding_member boolean not null default false,
  level text not null default 'New Member',
  lounge_points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_profiles_role on profiles(role);

-- -------------------------------------------------------------------------
-- BOOKS & CATEGORIES
-- -------------------------------------------------------------------------
create table if not exists categories (
  id uuid primary key default uuid_generate_v4(),
  name text unique not null,
  slug text unique not null,
  description text
);

create table if not exists books (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  author text not null,
  description text,
  cover_url text,
  genre text,
  publication_year integer,
  chapter_count integer default 0,
  is_public_domain boolean not null default false,
  status text not null default 'draft' check (status in ('draft','published','archived','coming_soon')),
  requires_access_grant boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists book_categories (
  book_id uuid references books(id) on delete cascade,
  category_id uuid references categories(id) on delete cascade,
  primary key (book_id, category_id)
);

-- Chapter metadata only. Actual file content lives in a PRIVATE storage
-- bucket ("book-content"); storage_path points to it. Never a public bucket.
create table if not exists book_chapters (
  id uuid primary key default uuid_generate_v4(),
  book_id uuid not null references books(id) on delete cascade,
  chapter_number integer not null,
  title text not null,
  storage_path text not null,
  word_count integer,
  created_at timestamptz not null default now(),
  unique (book_id, chapter_number)
);

-- Explicit grant of which members may access which books.
create table if not exists book_access (
  id uuid primary key default uuid_generate_v4(),
  book_id uuid not null references books(id) on delete cascade,
  member_id uuid not null references profiles(id) on delete cascade,
  granted_by uuid references profiles(id),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (book_id, member_id)
);

create table if not exists book_access_logs (
  id uuid primary key default uuid_generate_v4(),
  book_id uuid not null references books(id),
  member_id uuid not null references profiles(id),
  chapter_id uuid references book_chapters(id),
  action text not null check (action in ('view','signed_url_issued','download')),
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- READING PROGRESS, BOOKMARKS, NOTES
-- -------------------------------------------------------------------------
create table if not exists reading_progress (
  id uuid primary key default uuid_generate_v4(),
  member_id uuid not null references profiles(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,
  current_chapter_id uuid references book_chapters(id),
  percent_complete numeric(5,2) not null default 0 check (percent_complete between 0 and 100),
  status text not null default 'reading' check (status in ('not_started','reading','completed','abandoned')),
  started_at timestamptz default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (member_id, book_id)
);

create table if not exists bookmarks (
  id uuid primary key default uuid_generate_v4(),
  member_id uuid not null references profiles(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,
  chapter_id uuid references book_chapters(id),
  location text,
  label text,
  created_at timestamptz not null default now()
);

create table if not exists reading_notes (
  id uuid primary key default uuid_generate_v4(),
  member_id uuid not null references profiles(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,
  chapter_id uuid references book_chapters(id),
  location text,
  note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- EVENTS (WhatsApp-linked, no internal forum)
-- -------------------------------------------------------------------------
create table if not exists events (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  event_type text not null check (event_type in
    ('Book Discussion','Author Night','Reading Session','Literary Café','Writing Workshop','Challenge','Special Event')),
  book_id uuid references books(id),
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  whatsapp_url text,
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled')),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists event_reminders (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  offset_minutes integer not null, -- e.g. 10080 for 7 days
  channel text not null default 'in_app' check (channel in ('in_app','email','push','whatsapp')),
  sent_at timestamptz
);

create table if not exists event_attendance (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  member_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'interested' check (status in ('interested','joined','attended')),
  updated_at timestamptz not null default now(),
  unique (event_id, member_id)
);

-- -------------------------------------------------------------------------
-- REVIEWS
-- -------------------------------------------------------------------------
create table if not exists reviews (
  id uuid primary key default uuid_generate_v4(),
  book_id uuid not null references books(id) on delete cascade,
  member_id uuid not null references profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  review text,
  is_moderated boolean not null default false,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  unique (book_id, member_id)
);

-- -------------------------------------------------------------------------
-- CHALLENGES
-- -------------------------------------------------------------------------
create table if not exists challenges (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  starts_at date not null,
  ends_at date not null,
  points integer not null default 0,
  requirements jsonb not null default '{}',
  badge_id uuid,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists challenge_progress (
  id uuid primary key default uuid_generate_v4(),
  challenge_id uuid not null references challenges(id) on delete cascade,
  member_id uuid not null references profiles(id) on delete cascade,
  progress jsonb not null default '{}',
  completed boolean not null default false,
  completed_at timestamptz,
  unique (challenge_id, member_id)
);

-- -------------------------------------------------------------------------
-- POINTS & BADGES
-- -------------------------------------------------------------------------
create table if not exists points_transactions (
  id uuid primary key default uuid_generate_v4(),
  member_id uuid not null references profiles(id) on delete cascade,
  activity_type text not null,
  points integer not null,
  reference_table text,
  reference_id uuid,
  description text,
  created_at timestamptz not null default now(),
  -- prevents the same activity+reference firing points twice
  unique (member_id, activity_type, reference_table, reference_id)
);

create table if not exists badges (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  name text not null,
  description text,
  icon text,
  criteria jsonb not null default '{}',
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists member_badges (
  id uuid primary key default uuid_generate_v4(),
  member_id uuid not null references profiles(id) on delete cascade,
  badge_id uuid not null references badges(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  unique (member_id, badge_id)
);

-- -------------------------------------------------------------------------
-- MEMBERSHIP & PAYMENTS
-- -------------------------------------------------------------------------
create table if not exists membership_plans (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  monthly_amount numeric(10,2) not null,
  currency text not null default 'GHS',
  effective_from date not null,
  is_active boolean not null default true
);

create table if not exists memberships (
  id uuid primary key default uuid_generate_v4(),
  member_id uuid not null references profiles(id) on delete cascade,
  plan_id uuid references membership_plans(id),
  status text not null default 'active' check (status in ('active','paused','cancelled')),
  started_at date not null default current_date,
  ended_at date
);

create table if not exists membership_payments (
  id uuid primary key default uuid_generate_v4(),
  member_id uuid not null references profiles(id) on delete cascade,
  membership_id uuid references memberships(id),
  amount numeric(10,2) not null,
  currency text not null default 'GHS',
  billing_month date not null, -- first-of-month marker, e.g. 2027-01-01
  payment_date date,
  payment_method text check (payment_method in ('Mobile Money','Bank Transfer','Cash','Card','Other')),
  reference_number text,
  status text not null default 'unpaid' check (status in ('unpaid','pending','paid','failed','refunded')),
  notes text,
  recorded_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (member_id, billing_month)
);

create table if not exists payment_allocations (
  id uuid primary key default uuid_generate_v4(),
  payment_id uuid not null references membership_payments(id) on delete cascade,
  fund_amount numeric(10,2) not null,
  note text,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- LOUNGE FUND & EXPENSES
-- -------------------------------------------------------------------------
create table if not exists lounge_fund_transactions (
  id uuid primary key default uuid_generate_v4(),
  type text not null check (type in ('income','expense')),
  amount numeric(10,2) not null,
  source_table text, -- 'membership_payments' or 'expenses'
  source_id uuid,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists expenses (
  id uuid primary key default uuid_generate_v4(),
  category text not null check (category in
    ('Venue','Refreshments','Books','Author','Transport','Event','Equipment','Marketing','Other')),
  description text not null,
  amount numeric(10,2) not null,
  currency text not null default 'GHS',
  expense_date date not null default current_date,
  event_id uuid references events(id),
  vendor text,
  payment_method text,
  receipt_reference text,
  recorded_by uuid references profiles(id),
  notes text,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- MEMBER OF THE MONTH
-- -------------------------------------------------------------------------
create table if not exists member_of_the_month (
  id uuid primary key default uuid_generate_v4(),
  member_id uuid not null references profiles(id),
  month integer not null check (month between 1 and 12),
  year integer not null,
  reason text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  unique (month, year)
);

-- -------------------------------------------------------------------------
-- NOTIFICATIONS
-- -------------------------------------------------------------------------
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  member_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- AUDIT LOGS (append-only)
-- -------------------------------------------------------------------------
create table if not exists audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references profiles(id),
  action text not null,
  entity_table text not null,
  entity_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- INDEXES
-- -------------------------------------------------------------------------
create index if not exists idx_reading_progress_member on reading_progress(member_id);
create index if not exists idx_notes_member_book on reading_notes(member_id, book_id);
create index if not exists idx_events_starts_at on events(starts_at);
create index if not exists idx_points_member on points_transactions(member_id);
create index if not exists idx_payments_member_month on membership_payments(member_id, billing_month);
create index if not exists idx_expenses_date on expenses(expense_date);
create index if not exists idx_audit_created on audit_logs(created_at);
create index if not exists idx_notifications_member_unread on notifications(member_id, is_read);
