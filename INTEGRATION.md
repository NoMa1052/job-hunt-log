# Resume Studio: setup

## Already done on sidekick-dev
- Tables: `resumes`, `resume_matches`, `ai_usage`
- New columns on `applications`: `job_description`, `cover_letter`, `resume_id` (existing rows unaffected)
- `profiles.plan` (free/pro). Users cannot change their own plan.
- Private `resumes` storage bucket, each user limited to their own folder
- Edge Function `resume-ai` (JWT required)

## Your steps
1. Add your API key as a secret on sidekick-dev:
   `supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref yceqxpjcarboaztjhxdc`
   (or Dashboard > Edge Functions > Secrets)
2. `npm install mammoth` (reads Word files in the browser)
3. Copy `src/lib/resumeAi.js`, `src/lib/resumeSchema.js`, and `src/components/resume/` into your repo.
   If your Supabase client isn't at `src/lib/supabase.js` exporting `supabase`, fix the import in those files.
4. Add a Resumes tab that renders `<ResumeStudio />`.
5. In your application detail view, render:
   `<ApplicationAiPanel application={app} onUpdated={(row) => ...} onOpenResume={(id) => ...} />`
6. Point your preview build at sidekick-dev (VITE_SUPABASE_URL / anon key), push to a branch, test on the Vercel preview.

## Testing Pro features on dev
Free plan blocks tailor, cover letters, and insights. To test them, run in the dev SQL editor:
`update profiles set plan = 'pro' where user_id = '<your dev user id>';`

## Going to production (later)
- Run `supabase/migrations/20260928_resume_studio.sql` on the production project
- `supabase functions download resume-ai --project-ref yceqxpjcarboaztjhxdc`, then deploy it to production
- Set the same secret on production

## Limits (per month, set in the Edge Function)
| | Free | Pro |
|---|---|---|
| Imports | 3 | 50 |
| AI edits | 20 | 500 |
| Job matches | 5 | 300 |
| Tailored resumes | 0 | 150 |
| Cover letters | 0 | 150 |
| Insights | 0 | 30 |
