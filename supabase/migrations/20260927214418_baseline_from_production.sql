-- Baseline: production's public schema as of 2026-09-27.
--
-- Originally applied to sidekick-dev to copy production's schema. Rewritten to
-- be idempotent (create ... if not exists, policies guarded) so it is a no-op on
-- production, where these objects already exist, and on sidekick-dev.
-- The hand-applied history that produced this schema lives in supabase/legacy/.

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  company text default '',
  position text default '',
  location text default '',
  date_applied date,
  status text default 'applied',
  hiring_manager text default '',
  connections text default '',
  link text default '',
  created_at timestamptz default now(),
  priority text default 'medium',
  source text default '',
  salary text default '',
  cover_letter_link text default '',
  next_action text default '',
  follow_up_date date,
  interview_date date,
  notes text default '',
  user_id uuid default auth.uid() references auth.users(id)
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  company text default '',
  careers_link text default '',
  notes text default '',
  created_at timestamptz default now(),
  last_clicked timestamptz,
  user_id uuid default auth.uid() references auth.users(id)
);

create table if not exists public.company_notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  note text default '',
  created_at timestamptz default now(),
  user_id uuid default auth.uid() references auth.users(id)
);

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  name text default '',
  company text default '',
  email text default '',
  phone text default '',
  other_contact text default '',
  created_at timestamptz default now(),
  user_id uuid default auth.uid() references auth.users(id)
);

create table if not exists public.conversation_entries (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references public.people(id) on delete cascade,
  date date,
  recommendation text default '',
  notes text default '',
  created_at timestamptz default now(),
  user_id uuid default auth.uid() references auth.users(id)
);

-- Deprecated (renamed from `conversations` in legacy migration 6). Zero rows,
-- unused by the app. Scheduled to be dropped in a later migration.
create table if not exists public.conversations_legacy (
  id uuid constraint conversations_pkey primary key default gen_random_uuid(),
  date date,
  person text default '',
  context text default '',
  recommendation text default '',
  notes text default '',
  created_at timestamptz default now(),
  email text default '',
  phone text default '',
  other_contact text default ''
);

alter table public.applications enable row level security;
alter table public.companies enable row level security;
alter table public.company_notes enable row level security;
alter table public.people enable row level security;
alter table public.conversation_entries enable row level security;
alter table public.conversations_legacy enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['applications', 'companies', 'company_notes', 'people', 'conversation_entries']
  loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = t and policyname = 'own ' || t
    ) then
      execute format(
        'create policy %I on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
        'own ' || t, t
      );
    end if;
  end loop;
end
$$;
