-- Phase 0 hardening. Idempotent; safe on production, sidekick-dev and a fresh
-- database. Nothing is deleted: deprecated data moves to the `archive` schema,
-- which the Supabase API doesn't expose.

-- 1. Archive deprecated data -------------------------------------------------

create schema if not exists archive;
revoke all on schema archive from public, anon, authenticated;

-- conversations_legacy: fully copied into people + conversation_entries by
-- legacy migration 6 (verified 2026-09-28). Unused by the app.
do $$
begin
  if to_regclass('public.conversations_legacy') is not null then
    if to_regclass('archive.conversations_legacy') is null then
      alter table public.conversations_legacy set schema archive;
    else
      -- Already archived once (e.g. the baseline was re-run): merge and drop.
      insert into archive.conversations_legacy
      select * from public.conversations_legacy
      on conflict do nothing;
      drop table public.conversations_legacy;
    end if;
  end if;
end
$$;

-- companies.notes: copied into company_notes by legacy migration 6 (verified
-- 2026-09-28). The app never reads or writes it.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'companies' and column_name = 'notes'
  ) then
    create table if not exists archive.companies_notes (
      company_id uuid,
      user_id uuid,
      notes text,
      archived_at timestamptz default now()
    );
    insert into archive.companies_notes (company_id, user_id, notes)
    select id, user_id, notes from public.companies where coalesce(notes, '') <> '';
    alter table public.companies drop column notes;
  end if;
end
$$;

revoke all on all tables in schema archive from public, anon, authenticated;

-- 2. Ownership: every row has an owner; deleting a user deletes their data ---

do $$
declare
  t text;
  n bigint;
begin
  foreach t in array array['applications', 'companies', 'company_notes', 'people', 'conversation_entries']
  loop
    execute format('select count(*) from public.%I where user_id is null', t) into n;
    if n > 0 then
      raise exception '% has % row(s) with no user_id. Assign owners before running this migration.', t, n;
    end if;
    execute format('alter table public.%I alter column user_id set not null', t);

    execute format('alter table public.%I drop constraint if exists %I', t, t || '_user_id_fkey');
    execute format(
      'alter table public.%I add constraint %I foreign key (user_id) references auth.users(id) on delete cascade',
      t, t || '_user_id_fkey'
    );
  end loop;

  -- Child rows always belong to a parent.
  if exists (select 1 from public.company_notes where company_id is null) then
    raise exception 'company_notes has rows with no company_id.';
  end if;
  alter table public.company_notes alter column company_id set not null;

  if exists (select 1 from public.conversation_entries where person_id is null) then
    raise exception 'conversation_entries has rows with no person_id.';
  end if;
  alter table public.conversation_entries alter column person_id set not null;
end
$$;

-- 3. Indexes for RLS filters and foreign keys ---------------------------------

create index if not exists applications_user_id_idx on public.applications (user_id);
create index if not exists companies_user_id_idx on public.companies (user_id);
create index if not exists company_notes_user_id_idx on public.company_notes (user_id);
create index if not exists company_notes_company_id_idx on public.company_notes (company_id);
create index if not exists people_user_id_idx on public.people (user_id);
create index if not exists conversation_entries_user_id_idx on public.conversation_entries (user_id);
create index if not exists conversation_entries_person_id_idx on public.conversation_entries (person_id);

-- 4. RLS policies --------------------------------------------------------------
-- Signed-in users only; auth.uid() evaluated once per query instead of per row;
-- child rows can only point at a parent the same user owns.

drop policy if exists "own applications" on public.applications;
create policy "own applications" on public.applications
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own companies" on public.companies;
create policy "own companies" on public.companies
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own people" on public.people;
create policy "own people" on public.people
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own company_notes" on public.company_notes;
create policy "own company_notes" on public.company_notes
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.companies c
      where c.id = company_id and c.user_id = (select auth.uid())
    )
  );

drop policy if exists "own conversation_entries" on public.conversation_entries;
create policy "own conversation_entries" on public.conversation_entries
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.people p
      where p.id = person_id and p.user_id = (select auth.uid())
    )
  );
