I'm adding AI resume and cover letter tools ("Resume Studio") to my job tracker app (React/Vite + Supabase, deployed on Vercel via git push). The backend is already built and deployed on my DEV Supabase project. Your job is to integrate the frontend into this repo and get it working on a Vercel preview.

ALWAYS PLAN FIRST. Before changing any file, read the repo and give me a short plan in plain-language bullets: which files you'll change, where the new tab and panel will go, and anything that looks off. Wait for my approval before making changes.

## Hard rules
- NEVER touch the production Supabase project (ref: etxzgstfaosrxxusbfwx). No migrations, no function deploys, no SQL there. Only use the dev project (ref: yceqxpjcarboaztjhxdc, name: sidekick-dev).
- Work on a new git branch called feature/resume-studio. Never push to main.
- Do not change existing app behavior for current users. All new database fields are optional and already exist on dev.
- Do not put any API keys in the frontend or in committed files.
- No em-dashes in any UI copy. Keep copy short, plain, sentence case.

## What already exists on sidekick-dev (do not recreate)
- Tables: resumes, resume_matches, ai_usage (all with row-level security)
- New columns on applications: job_description (text), cover_letter (text), resume_id (uuid, nullable)
- profiles.plan ('free' or 'pro'); users cannot change it themselves
- Private storage bucket "resumes", each user limited to their own folder ({user_id}/...)
- Edge Function "resume-ai" (JWT required). Actions: usage, parse, improve, match, tailor, cover_letter, insights
- ANTHROPIC_API_KEY secret is set

## Files to integrate
They're in ./sidekick-resume-studio/. Read INTEGRATION.md first.
- src/lib/resumeAi.js and src/lib/resumeSchema.js -> move into this repo's src/lib/
- src/components/resume/* -> move into src/components/resume/
- supabase/migrations/20260928_resume_studio.sql -> move into supabase/migrations/ (reference only; already applied on dev, do NOT run it anywhere)
- Also pull the deployed edge function source into the repo so it's version-controlled:
  supabase functions download resume-ai --project-ref yceqxpjcarboaztjhxdc
  (if the CLI isn't installed or linked, tell me and skip this step)
- Delete the ./sidekick-resume-studio/ folder once everything is moved.

## Integration tasks
1. Run: npm install mammoth
2. Fix the Supabase client import in the new files to match wherever this repo's client lives and how it's exported.
3. Add a "Resumes" tab to the main nav, alongside Applications, Conversations, and Companies. It renders <ResumeStudio />.
4. In the application detail/edit view, add <ApplicationAiPanel application={app} onUpdated={...} onOpenResume={...} />.
   - onUpdated receives the updated application row; update local state so the Applications table reflects it.
   - onOpenResume(id) should switch to the Resumes tab with that resume open (ResumeStudio accepts initialResumeId).
   - If the detail view is a modal or drawer that's too small, put the panel in a section or sub-tab of that view. Tell me what you chose.
5. The app has a table_views feature with a check constraint allowing only 'applications', 'people', 'companies'. Do NOT add resumes to it.
6. Match the new components to the app's existing look. resume.css uses --sk-* CSS variables at the top; map them to this app's existing colors, fonts, radius, and button styles instead of duplicating styles. Keep dark mode working if the app has it.
7. Make sure the new Applications columns (job_description, cover_letter, resume_id) don't break any existing table, CSV export, or column picker. Don't add them as visible table columns unless there's an obvious pattern for it.
8. Check that the Supabase URL and anon key come from env vars (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY or whatever this repo uses). Tell me the exact variable names so I can set Preview values in Vercel to point at sidekick-dev.

## Testing
- Run the dev server against sidekick-dev (create .env.local with dev values if needed; make sure .env.local is gitignored).
- Run a production build (npm run build) and fix any errors or warnings from the new code.
- To test Pro features, give me this SQL to run in the sidekick-dev SQL editor (fill in my dev user id if you can find it, otherwise tell me how):
  update profiles set plan = 'pro' where user_id = '<dev user id>';
- Walk me through this checklist and fix anything that fails:
  [ ] Resumes tab loads with the empty state
  [ ] "Start from scratch" creates a resume and opens the editor
  [ ] Import a PDF resume: sections fill in correctly
  [ ] Import a .docx resume: sections fill in correctly
  [ ] Edit fields, Save, reload page: edits persist
  [ ] "Improve with AI" on summary, a role, and skills: suggestion appears, "Use this version" applies it
  [ ] Export PDF: print dialog shows only the resume, clean layout
  [ ] First resume is marked Default; "Make default" switches it
  [ ] Duplicate and Delete work
  [ ] On an application: paste job description, "Score my match" shows score, missing keywords, rewrites
  [ ] "Tailor resume to this job" creates a tailored copy, links it, and it shows under "Tailored for specific jobs"
  [ ] Cover letter: first draft, improve draft, tone switch, save, copy all work
  [ ] Insights runs after 3+ applications have job descriptions
  [ ] With plan set back to 'free', Pro features show "This is a Pro feature." instead of breaking
  [ ] Existing Applications, Conversations, Companies tabs work exactly as before
  [ ] Layout works on a phone-width screen

## Finish
- Commit with clear messages and push feature/resume-studio.
- Give me a plain-bullet summary: what changed, anything you couldn't do, and exactly what I need to set in Vercel (variable names and which environment) so the preview uses sidekick-dev.
