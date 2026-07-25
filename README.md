# Job Hunt Log

Applications ledger + networking conversation log. React + Vite, data in Supabase, deployed on Vercel.

## 1. Supabase (the database)

1. Go to supabase.com, create a free project.
2. In the project, open the SQL Editor and run everything in `supabase-schema.sql` (creates the two tables and seeds your MLB row).
3. Go to Project Settings → API. Copy the **Project URL** and the **anon public** key — you'll need both in step 3.

No auth or row-level security is set up, so the anon key has full read/write on these two tables. That's fine for a personal tracker with an unguessable URL; skip if you'd rather lock it down later.

## 2. Push to GitHub

1. Create a new repo, e.g. `job-hunt-log`.
2. Copy all these files into it (keep the folder structure — `src/` stays a folder).
3. Commit and push, same as your other projects.

## 3. Deploy on Vercel

1. Import the repo in Vercel (framework preset: Vite).
2. Before the first deploy, add two environment variables in Vercel's project settings:
   - `VITE_SUPABASE_URL` → the Project URL from step 1
   - `VITE_SUPABASE_ANON_KEY` → the anon key from step 1
3. Deploy. Vercel will auto-redeploy on every push after this, same as your FBA tracker.

## Local dev (optional)

```
npm install
cp .env.example .env.local   # fill in your Supabase URL + anon key
npm run dev
```
