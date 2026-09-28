# Sidekick

Formerly Job Hunt Log.

Applications ledger, networking conversation log and companies watchlist. React + Vite, data in Supabase (auth + Postgres with row-level security), deployed on Vercel.

## Environments

| Environment | Supabase | Vercel |
|---|---|---|
| Production | production project | Production deployment (`main`) |
| Preview / local | `sidekick-dev` Supabase project (never production) | Preview deployments, `npm run dev` |

Production has live user data. Don't point local dev or Vercel Preview deployments at the production database: the Preview-scoped `VITE_SUPABASE_*` variables in Vercel must hold `sidekick-dev` values.

## Local development

Requires Node 24 (see `.nvmrc`).

```
npm ci
cp .env.example .env.local   # fill in the sidekick-dev URL + anon key
npm run dev
```

Before pushing, run the same checks as CI:

```
npm run check   # lint + tests + build
```

`.env*` files are git-ignored (except `.env.example`). Never commit real keys.

## Database

All user tables (`applications`, `companies`, `company_notes`, `people`, `conversation_entries`) have a required `user_id` column (deleting a user deletes their rows) and RLS policies that limit each signed-in user to their own rows. Conversation entries and company notes can only point at a person or company the same user owns. The client never filters by `user_id` itself; it relies on RLS and on the `user_id default auth.uid()` column default.

Schema changes go in as migration files in `supabase/migrations/`, applied to `sidekick-dev` first and to production only after review. Never edit either database directly. Every migration must be safe to run on production, on `sidekick-dev` and on an empty database.

Apply migrations with the Supabase CLI (Node 24; the CLI runs via `npx`):

```
npx supabase link --project-ref <project-ref>   # asks for the database password
npx supabase migration list                     # compare local vs remote history
npx supabase db push --dry-run                  # review what will run
npx supabase db push
```

If `migration list` shows a local migration older than the newest remote one, `db push` needs `--include-all`. Migrations are written to be idempotent so that this is safe.

Other tables:

- `table_views`: saved views for each tab (`applications`, `people` for Conversations, `companies`): columns, sort and filters, one row per view, own rows only. `is_default` marks the view a tab opens with (at most one per user and tab).
- `profiles`: one row per user (first and last name, target roles, location, bio, date format; `full_name` is kept in sync for older clients), created on first save, own row only. `default_view_id` is the older Applications-only default, kept for compatibility; the app now uses `table_views.is_default`.
- `delete_my_account()`: a function signed-in users call to delete their own account. Every user table cascades from `auth.users`, so all of their data goes with it. It can only ever delete the caller; signed-out requests can't run it.

The `archive` schema (not exposed by the API) keeps deprecated data that was moved out of `public` instead of deleted: the old `conversations_legacy` table and the old `companies.notes` column.

`supabase/legacy/` holds the historical, hand-applied SQL that built the original schema. It's kept for reference only and doesn't match production; don't run it.

## Auth email links

Sign-up confirmation and password-reset emails link back to the site the user is on (`/app` and `/reset-password`). Each Supabase project must allow those URLs under Authentication → URL Configuration:

- Production: Site URL `https://myjobhuntlog.vercel.app`, redirect URL `https://myjobhuntlog.vercel.app/**`
- sidekick-dev: redirect URLs for Vercel previews (`https://*-sports-survivor.vercel.app/**`) and `http://localhost:5173/**`

## Deploying

Vercel builds on every push. Merges to `main` deploy to production.
