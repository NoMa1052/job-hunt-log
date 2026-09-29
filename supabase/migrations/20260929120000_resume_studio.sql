-- Resume Studio: resumes, AI match results, AI usage log, plan tier,
-- new application fields and a private storage bucket for uploaded files.
-- Idempotent; safe on production, sidekick-dev and a fresh database.
-- The AI calls run in the resume-ai Edge Function (supabase/functions).

-- Resumes, stored as structured sections so AI can edit one part at a time.
create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default 'My Resume' check (char_length(btrim(title)) between 1 and 100),
  target_role text not null default '' check (char_length(target_role) <= 100),
  content jsonb not null default '{"contact":{},"summary":"","experience":[],"education":[],"skills":[],"projects":[]}'::jsonb,
  source_file_path text,
  is_default boolean not null default false,
  parent_resume_id uuid references public.resumes(id) on delete set null,
  application_id uuid references public.applications(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists resumes_user_id_idx on public.resumes (user_id);
create index if not exists resumes_application_id_idx on public.resumes (application_id);
create index if not exists resumes_parent_resume_id_idx on public.resumes (parent_resume_id);
create unique index if not exists resumes_one_default_per_user on public.resumes (user_id) where is_default;

alter table public.resumes enable row level security;
drop policy if exists "resumes_select_own" on public.resumes;
drop policy if exists "resumes_insert_own" on public.resumes;
drop policy if exists "resumes_update_own" on public.resumes;
drop policy if exists "resumes_delete_own" on public.resumes;
drop policy if exists "own resumes" on public.resumes;
-- Own rows only; a tailored resume can only point at the user's own application.
create policy "own resumes" on public.resumes
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      application_id is null
      or exists (select 1 from public.applications a where a.id = application_id and a.user_id = (select auth.uid()))
    )
  );

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

drop trigger if exists resumes_set_updated_at on public.resumes;
create trigger resumes_set_updated_at
  before update on public.resumes
  for each row execute function public.set_updated_at();

-- New application fields. Defaults mean existing rows and older clients are unaffected.
alter table public.applications add column if not exists job_description text not null default '';
alter table public.applications add column if not exists cover_letter text not null default '';
alter table public.applications add column if not exists resume_id uuid references public.resumes(id) on delete set null;
create index if not exists applications_resume_id_idx on public.applications (resume_id);

-- Match results. Written only by the Edge Function (service role); users can read and delete their own.
create table if not exists public.resume_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  resume_id uuid references public.resumes(id) on delete set null,
  score integer check (score between 0 and 100),
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists resume_matches_user_id_idx on public.resume_matches (user_id);
create index if not exists resume_matches_application_id_idx on public.resume_matches (application_id);
create index if not exists resume_matches_resume_id_idx on public.resume_matches (resume_id);
alter table public.resume_matches enable row level security;
drop policy if exists "resume_matches_select_own" on public.resume_matches;
drop policy if exists "resume_matches_delete_own" on public.resume_matches;
create policy "resume_matches_select_own" on public.resume_matches
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "resume_matches_delete_own" on public.resume_matches
  for delete to authenticated using ((select auth.uid()) = user_id);

-- AI usage log for monthly limits. Written only by the Edge Function; users can read their own.
create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_user_created_idx on public.ai_usage (user_id, created_at desc);
alter table public.ai_usage enable row level security;
drop policy if exists "ai_usage_select_own" on public.ai_usage;
create policy "ai_usage_select_own" on public.ai_usage
  for select to authenticated using ((select auth.uid()) = user_id);

-- Plan tier. Signed-in users can't set or change it; only the service role
-- (Stripe webhook later) or the SQL editor can.
alter table public.profiles add column if not exists plan text not null default 'free'
  check (plan in ('free', 'pro'));

create or replace function public.protect_profile_plan()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') not in ('authenticated', 'anon') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.plan := 'free';
  elsif new.plan is distinct from old.plan then
    new.plan := old.plan;
  end if;
  return new;
end
$$;

drop trigger if exists profiles_protect_plan on public.profiles;
create trigger profiles_protect_plan
  before insert or update on public.profiles
  for each row execute function public.protect_profile_plan();

-- Private bucket for uploaded resume files: {user_id}/{file}. PDF and Word only, 5 MB max.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 5242880,
  array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "resume_files_select_own" on storage.objects;
drop policy if exists "resume_files_insert_own" on storage.objects;
drop policy if exists "resume_files_update_own" on storage.objects;
drop policy if exists "resume_files_delete_own" on storage.objects;
create policy "resume_files_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "resume_files_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "resume_files_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "resume_files_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
