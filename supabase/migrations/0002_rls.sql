-- =========================================================================
-- ROW LEVEL SECURITY
-- Principle: members see/manage only their own data; admins/librarians/
-- moderators get elevated read/write on the tables their job needs.
-- We avoid recursive policies by using a SECURITY DEFINER helper
-- (is_staff / is_admin) instead of querying `profiles` inside its own
-- policy, and by restricting the function's search_path.
-- =========================================================================

alter table profiles enable row level security;
alter table books enable row level security;
alter table categories enable row level security;
alter table book_categories enable row level security;
alter table book_chapters enable row level security;
alter table book_access enable row level security;
alter table book_access_logs enable row level security;
alter table reading_progress enable row level security;
alter table bookmarks enable row level security;
alter table reading_notes enable row level security;
alter table events enable row level security;
alter table event_reminders enable row level security;
alter table event_attendance enable row level security;
alter table reviews enable row level security;
alter table challenges enable row level security;
alter table challenge_progress enable row level security;
alter table points_transactions enable row level security;
alter table badges enable row level security;
alter table member_badges enable row level security;
alter table membership_plans enable row level security;
alter table memberships enable row level security;
alter table membership_payments enable row level security;
alter table payment_allocations enable row level security;
alter table lounge_fund_transactions enable row level security;
alter table expenses enable row level security;
alter table member_of_the_month enable row level security;
alter table notifications enable row level security;
alter table audit_logs enable row level security;

-- -------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER, locked search_path — required so
-- RLS policies can check role without re-triggering RLS recursively)
-- -------------------------------------------------------------------------
create or replace function is_staff(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles
    where id = uid and role in ('admin','librarian','moderator')
  );
$$;

create or replace function is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from profiles where id = uid and role = 'admin');
$$;

create or replace function has_book_access(uid uuid, bid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from book_access
    where member_id = uid and book_id = bid and revoked_at is null
  );
$$;

-- -------------------------------------------------------------------------
-- PROFILES
-- -------------------------------------------------------------------------
create policy "profiles_select_own_or_staff" on profiles for select
  using (id = auth.uid() or is_staff(auth.uid()));
create policy "profiles_update_own" on profiles for update
  using (id = auth.uid());
create policy "profiles_admin_update" on profiles for update
  using (is_admin(auth.uid()));
create policy "profiles_insert_self" on profiles for insert
  with check (id = auth.uid());

-- -------------------------------------------------------------------------
-- BOOKS / CATEGORIES (public catalog metadata is readable by any logged-in
-- member; only staff can write)
-- -------------------------------------------------------------------------
create policy "books_select_published" on books for select
  using (status = 'published' or is_staff(auth.uid()));
create policy "books_staff_write" on books for all
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

create policy "categories_select_all" on categories for select using (true);
create policy "categories_staff_write" on categories for all
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

create policy "book_categories_select_all" on book_categories for select using (true);
create policy "book_categories_staff_write" on book_categories for all
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

-- Chapter METADATA is visible if you have access; actual file bytes are
-- served only via short-lived signed URLs, never this table's storage_path
-- alone (see services/bookAccess.ts).
create policy "chapters_select_with_access" on book_chapters for select
  using (has_book_access(auth.uid(), book_id) or is_staff(auth.uid()));
create policy "chapters_staff_write" on book_chapters for all
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

create policy "book_access_select_own_or_staff" on book_access for select
  using (member_id = auth.uid() or is_staff(auth.uid()));
create policy "book_access_staff_write" on book_access for all
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

create policy "access_logs_insert_own" on book_access_logs for insert
  with check (member_id = auth.uid());
create policy "access_logs_select_staff" on book_access_logs for select
  using (is_staff(auth.uid()));

-- -------------------------------------------------------------------------
-- READING PROGRESS / BOOKMARKS / NOTES — strictly own-data
-- -------------------------------------------------------------------------
create policy "progress_own" on reading_progress for all
  using (member_id = auth.uid()) with check (member_id = auth.uid());
create policy "bookmarks_own" on bookmarks for all
  using (member_id = auth.uid()) with check (member_id = auth.uid());
-- Notes are private by default: staff do NOT get a blanket read policy.
create policy "notes_own_only" on reading_notes for all
  using (member_id = auth.uid()) with check (member_id = auth.uid());

-- -------------------------------------------------------------------------
-- EVENTS
-- -------------------------------------------------------------------------
create policy "events_select_all_authenticated" on events for select
  using (auth.uid() is not null);
create policy "events_staff_write" on events for all
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

create policy "reminders_staff_only" on event_reminders for all
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

create policy "attendance_own" on event_attendance for all
  using (member_id = auth.uid() or is_staff(auth.uid()))
  with check (member_id = auth.uid());

-- -------------------------------------------------------------------------
-- REVIEWS
-- -------------------------------------------------------------------------
create policy "reviews_select_visible" on reviews for select
  using (is_hidden = false or member_id = auth.uid() or is_staff(auth.uid()));
create policy "reviews_insert_own" on reviews for insert
  with check (member_id = auth.uid());
create policy "reviews_update_own_or_staff" on reviews for update
  using (member_id = auth.uid() or is_staff(auth.uid()));

-- -------------------------------------------------------------------------
-- CHALLENGES
-- -------------------------------------------------------------------------
create policy "challenges_select_all" on challenges for select using (true);
create policy "challenges_staff_write" on challenges for all
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

create policy "challenge_progress_own" on challenge_progress for all
  using (member_id = auth.uid() or is_staff(auth.uid()))
  with check (member_id = auth.uid());

-- -------------------------------------------------------------------------
-- POINTS / BADGES — members read own history; only server-side functions
-- (SECURITY DEFINER, see 0003_functions.sql) may INSERT points, so there
-- is deliberately no member insert policy here (prevents point-farming).
-- -------------------------------------------------------------------------
create policy "points_select_own_or_staff" on points_transactions for select
  using (member_id = auth.uid() or is_staff(auth.uid()));
create policy "points_staff_adjust" on points_transactions for insert
  with check (is_staff(auth.uid()));

create policy "badges_select_all" on badges for select using (true);
create policy "badges_admin_write" on badges for all
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

create policy "member_badges_select_own_or_staff" on member_badges for select
  using (member_id = auth.uid() or is_staff(auth.uid()));
create policy "member_badges_staff_insert" on member_badges for insert
  with check (is_staff(auth.uid()));

-- -------------------------------------------------------------------------
-- MEMBERSHIP & PAYMENTS — members see only their own financial records
-- -------------------------------------------------------------------------
create policy "plans_select_all" on membership_plans for select using (true);
create policy "plans_admin_write" on membership_plans for all
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

create policy "memberships_select_own_or_staff" on memberships for select
  using (member_id = auth.uid() or is_staff(auth.uid()));
create policy "memberships_admin_write" on memberships for all
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

create policy "payments_select_own_or_staff" on membership_payments for select
  using (member_id = auth.uid() or is_staff(auth.uid()));
create policy "payments_admin_write" on membership_payments for all
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

create policy "allocations_staff_only" on payment_allocations for all
  using (is_staff(auth.uid())) with check (is_admin(auth.uid()));

-- -------------------------------------------------------------------------
-- FUND / EXPENSES — admin-only visibility (organisational finances)
-- -------------------------------------------------------------------------
create policy "fund_admin_only" on lounge_fund_transactions for all
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "expenses_admin_only" on expenses for all
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- -------------------------------------------------------------------------
-- MEMBER OF THE MONTH
-- -------------------------------------------------------------------------
create policy "motm_select_public_or_staff" on member_of_the_month for select
  using (is_public = true or is_staff(auth.uid()));
create policy "motm_admin_write" on member_of_the_month for all
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- -------------------------------------------------------------------------
-- NOTIFICATIONS — own only
-- -------------------------------------------------------------------------
create policy "notifications_own" on notifications for all
  using (member_id = auth.uid()) with check (member_id = auth.uid());

-- -------------------------------------------------------------------------
-- AUDIT LOGS — staff can read, nobody can update/delete (append-only),
-- inserts happen via SECURITY DEFINER functions only.
-- -------------------------------------------------------------------------
create policy "audit_select_staff" on audit_logs for select
  using (is_staff(auth.uid()));
