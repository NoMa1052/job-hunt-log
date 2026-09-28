# Job Hunt Log

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

`.env*` files are git-ignored (except `.env.example`). Never commit real keys.

## Database

All user tables (`applications`, `companies`, `company_notes`, `people`, `conversation_entries`) have a `user_id` column and RLS policies that limit each user to their own rows. The client never filters by `user_id` itself; it relies on RLS and on the `user_id default auth.uid()` column default.

Schema changes go in as migration files in `supabase/migrations/`, applied to `sidekick-dev` first and to production only after review. Never edit either database directly. Every migration must be safe to run on production, on `sidekick-dev` and on an empty database.

Apply migrations with the Supabase CLI (Node 24; the CLI runs via `npx`):

```
npx supabase link --project-ref <project-ref>   # asks for the database password
npx supabase migration list                     # compare local vs remote history
npx supabase db push --dry-run                  # review what will run
npx supabase db push
```

If `migration list` shows a local migration older than the newest remote one, `db push` needs `--include-all`. Migrations are written to be idempotent so that this is safe.

`supabase/legacy/` holds the historical, hand-applied SQL that built the original schema. It's kept for reference only and doesn't match production; don't run it.

## Deploying

Vercel builds on every push. Merges to `main` deploy to production.
