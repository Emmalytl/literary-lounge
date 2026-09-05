# The Literary Lounge

Read. Discuss. Connect.

A digital clubhouse for a reading community: browse a private library, read
online, track progress, join WhatsApp-based discussions, earn points and
badges, and (from January 2027) pay monthly dues that fund the Lounge.

## What's built vs. what's scaffolded

This repo is a real, working foundation — not a mockup. Wired up end-to-end:

- Supabase auth (register / login / logout / password reset / protected routes)
- Full Postgres schema with Row Level Security for every table (see `supabase/migrations`)
- Secure book access: private storage bucket + Edge Function that checks
  `book_access` and mints a 5-minute signed URL, with access logging
- Member dashboard, library, online reader (chapters, progress, font size, dark mode)
- Events with WhatsApp deep links and RSVP
- Points via a de-duplicated `award_points()` DB function (can't be farmed)
- Membership dues table + payment history view for members
- Admin dashboard: members, books, events, payment recording, expense recording
  (via `record_payment()` / `record_expense()`, which also update the Lounge Fund
  ledger and audit log automatically)
- PWA shell (installable, offline app shell) — see note below on offline reading

Admin member deletion and role changes require migration `0014_admin_member_management.sql`
and the `admin-delete-member` Edge Function. The welcome email flow uses the
`send-welcome-email` Edge Function and requires `RESEND_API_KEY`,
`WELCOME_EMAIL_FROM`, and `APP_URL` Supabase secrets. It sends once after the
member's email is confirmed and includes the Lounge logo and welcome message.

Deliberately left as documented next-steps (the schema already supports them,
so no rebuild is needed to add them):

- Monthly / six-month / annual financial report screens and CSV/Excel/PDF export
  (`membership_payments`, `expenses`, `lounge_fund_transactions` already hold
  everything needed — see "Financial reporting" below)
- Badge auto-awarding logic (badges + `member_badges` tables exist; the trigger
  that evaluates `badges.criteria` after each `points_transactions` insert is
  the next piece to write)
- Reading challenges progress UI (tables exist, admin CRUD not yet built)
- Notification center UI (table + RLS exist; no bell icon yet)
- True offline reading (IndexedDB caching of authorised chapter text, tied to
  session, revocable) — the PWA shell is ready but this is not implemented
- Uploading real chapter content — seed data is placeholder text only, see
  "White Fang content" below

## Tech stack

- **Frontend:** React + Vite + TypeScript, Tailwind CSS, React Router, lucide-react
- **Backend:** Supabase (Postgres, Auth, Storage, Row Level Security, Edge Functions)
- **PWA:** vite-plugin-pwa

## Installation

```bash
npm install
cp .env.example .env
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

## Environment variables

Only two are needed on the frontend (`.env`):

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Same page, "anon public" key |

**Never** put the `service_role` key in a `VITE_` variable — it belongs only
in Edge Function secrets (see below).

## Supabase setup

1. Create a new Supabase project.
2. In the SQL editor (or via CLI), run the migrations **in order**:
   ```
   supabase/migrations/0001_schema.sql
   supabase/migrations/0002_rls.sql
   supabase/migrations/0003_functions.sql
   supabase/migrations/0004_storage.sql
   ```
   Or with the CLI: `supabase db push` after linking your project.
3. Optionally load demo data: `supabase/seed/seed.sql`.
4. Deploy the Edge Function that serves protected chapters:
   ```bash
   supabase functions deploy get-chapter-url
   supabase secrets set SUPABASE_URL=https://your-ref.supabase.co
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   supabase secrets set SUPABASE_ANON_KEY=your-anon-key
   ```

## Database migration instructions

Migrations are plain, idempotent SQL — safe to re-run. Apply them in numeric
order. If you add new tables later, add a new `000N_description.sql` file
rather than editing old ones, so history stays auditable.

## Storage setup

Four buckets are created by `0004_storage.sql`:

| Bucket | Public? | Purpose |
|---|---|---|
| `book-covers` | Yes | Cover images |
| `avatars` | Yes | Profile photos |
| `book-content` | **No** | Chapter files — served only via signed URL |
| `receipts` | **No** | Expense receipts, admin-only |

## Authentication setup

Supabase Auth handles email/password. A trigger (`handle_new_user`) creates a
`profiles` row automatically on sign-up with role `member`. To make someone
an admin, update their `profiles.role` directly in the Supabase dashboard —
**never** trust a role sent from the frontend.

## Local development

```bash
npm run dev       # http://localhost:5173
npm run build     # production build to dist/
npm run preview   # preview the production build
```

## GitHub setup

```bash
git init
git add .
git commit -m "Initial commit: The Literary Lounge foundation"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

## Deployment

- **Frontend:** deploy `dist/` (after `npm run build`) to Vercel, Netlify, or
  any static host. Set the same two `VITE_` env vars in the host's dashboard.
- **Backend:** Supabase is already hosted — no separate deploy step beyond
  the migrations and Edge Function above.

## Admin account setup

1. Register a normal account through the app.
2. In Supabase → Table Editor → `profiles`, find that row and change `role`
   from `member` to `admin`.
3. Log out and back in — the Admin link appears in the sidebar.

## Payment recording workflow

Admin goes to **Admin → Monthly Dues**, picks the member, billing month,
amount, and method, and submits. This calls `record_payment()`, which:

1. Inserts/updates the `membership_payments` row (one per member per month).
2. Adds a matching income row to `lounge_fund_transactions`.
3. Writes an `audit_logs` entry.

All three happen in one transaction, so the fund balance can never drift out
of sync with recorded payments.

## Financial reporting workflow

Not yet built as UI, but every number it needs already exists:

- **Monthly report:** `sum(amount) where billing_month = X` from
  `membership_payments`, joined against active `memberships` for the
  expected-vs-collected comparison.
- **Six-month / annual report:** same query with a wider `billing_month` range,
  plus `expenses` grouped by `category` for the spending side.
- **Fund balance:** already available via the `fund_balance()` SQL function
  used on the Admin Overview page.

Building the report screens is mostly presentation work on top of these
queries — no schema changes required.

## Book upload workflow

1. Admin creates the book record in **Admin → Books** (starts as `draft`).
2. Upload the chapter file(s) to the private `book-content` bucket (via the
   Supabase Storage dashboard, or a small upload script using the
   service-role key from a trusted environment — never the browser).
3. Insert a row per chapter into `book_chapters` with the matching
   `storage_path`.
4. Grant access: either leave `books.requires_access_grant = false` (open to
   all members, as White Fang is seeded), or insert rows into `book_access`
   per member.
5. Set `books.status = 'published'`.

## Security notes

- RLS is enabled on every table; policies are reviewed in
  `supabase/migrations/0002_rls.sql` with comments explaining each decision.
- Role checks use `SECURITY DEFINER` helper functions (`is_staff`, `is_admin`)
  with a locked `search_path`, avoiding recursive-policy bugs.
- Points can only be awarded through `award_points()`, which has a unique
  constraint on `(member_id, activity_type, reference_table, reference_id)` —
  this is what prevents point-farming by repeated clicks.
- Chapter files are never served from a public URL. The Edge Function checks
  `book_access` before minting a signed URL that expires in 5 minutes, and
  logs every access to `book_access_logs`.
- This does **not** claim to prevent screenshots or all forms of casual
  sharing — no web app can. It makes unauthorised redistribution
  meaningfully harder and traceable, not impossible.
- No payment card data is ever stored. Manual payments store a reference
  number only.

## White Fang content

*White Fang* (Jack London, d. 1916) is in the public domain, but this repo
does **not** bundle a copyrighted modern edition or even the public-domain
text itself — the seeded chapters are placeholder text. Source a legitimate
public-domain edition (e.g. Project Gutenberg) and upload it yourself
following the book upload workflow above.

## Future development roadmap

See "What's built vs. what's scaffolded" above for the prioritised list.
Beyond that, the schema was designed so these don't require restructuring:
physical Lounge chapters/locations, sponsorships, premium memberships, paid
workshops, native mobile apps, automated Mobile Money payments, and
corporate/university memberships.

## Project structure

```
src/
  components/     shared UI (Toast, ProtectedRoute)
  layouts/        PublicLayout, MemberLayout, AdminLayout
  pages/          route-level screens (+ pages/admin/)
  features/       auth context, per-domain logic
  services/       Supabase query wrappers (books, events, points)
  lib/            supabase client, generated types
supabase/
  migrations/     schema, RLS, functions, storage (run in order)
  functions/      get-chapter-url Edge Function
  seed/           demo data
```
