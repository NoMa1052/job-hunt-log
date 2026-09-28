-- Saved table views (column layout, sort, filters), synced across devices.
-- Idempotent; safe on production, sidekick-dev and a fresh database.

create table if not exists public.table_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  table_name text not null check (table_name in ('applications')),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  position integer not null default 0,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists table_views_user_table_idx on public.table_views (user_id, table_name, position);

alter table public.table_views enable row level security;

drop policy if exists "own table_views" on public.table_views;
create policy "own table_views" on public.table_views
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Keep updated_at current on every change.
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

drop trigger if exists table_views_set_updated_at on public.table_views;
create trigger table_views_set_updated_at
  before update on public.table_views
  for each row execute function public.set_updated_at();
