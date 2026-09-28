-- Profiles (one row per user) and self-service account deletion.
-- Idempotent; safe on production, sidekick-dev and a fresh database.
-- Requires 20260928200000_table_views.sql (default_view_id references it).

create table if not exists public.profiles (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 100),
  target_roles text[] not null default '{}' check (cardinality(target_roles) <= 20),
  location text not null default '' check (char_length(location) <= 100),
  bio text not null default '' check (char_length(bio) <= 1000),
  default_view_id uuid references public.table_views(id) on delete set null,
  date_format text not null default 'month_day' check (date_format in ('month_day', 'day_month', 'iso')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_default_view_id_idx on public.profiles (default_view_id);

alter table public.profiles enable row level security;

-- Own row only; a default view must be one of the user's own views.
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      default_view_id is null
      or exists (
        select 1 from public.table_views v
        where v.id = default_view_id and v.user_id = (select auth.uid())
      )
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

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Delete the signed-in user's account. Every user table references
-- auth.users with on delete cascade, so all of their data goes with it.
-- Runs with elevated rights but can only ever delete the caller.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  delete from auth.users where id = uid;
end
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
