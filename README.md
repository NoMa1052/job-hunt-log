# Job Hunt Log

Applications ledger, networking conversation log and companies watchlist. React + Vite, data in Supabase (auth + Postgres with row-level security), deployed on Vercel.

## Environments

| Environment | Supabase | Vercel |
|---|---|---|
| Production | production project | Production deployment (`main`) |
| Preview / local | Supabase dev branch (never production) | Preview deployments, `npm run dev` |

Production has live user data. Don't point local dev or Vercel Preview deployments at the production database: the Preview-scoped `VITE_SUPABASE_*` variables in Vercel must hold the dev branch's values.

## Local development

Requires Node 22 (see `.nvmrc`).

```
npm ci
cp .env.example .env.local   # fill in the dev branch URL + anon key
npm run dev
```

`.env*` files are git-ignored (except `.env.example`). Never commit real keys.

## Database

All user tables (`applications`, `companies`, `company_notes`, `people`, `conversation_entries`) have a `user_id` column and RLS policies that limit each user to their own rows. The client never filters by `user_id` itself; it relies on RLS and on the `user_id default auth.uid()` column default.

Schema changes go in as migration files applied to a Supabase dev branch first, never as direct edits to production. The `supabase-*.sql` files at the repo root are the historical, hand-applied migrations and don't fully match production. Don't run them against a new project.

## Deploying

Vercel builds on every push. Merges to `main` deploy to production.
