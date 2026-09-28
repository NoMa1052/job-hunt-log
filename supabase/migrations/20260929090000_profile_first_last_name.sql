-- Split the profile name into first and last name.
-- Idempotent; safe on production, sidekick-dev and a fresh database.
-- full_name stays (the app keeps it in sync) for older clients.

alter table public.profiles add column if not exists first_name text not null default ''
  check (char_length(first_name) <= 50);
alter table public.profiles add column if not exists last_name text not null default ''
  check (char_length(last_name) <= 50);

-- Existing names: first word is the first name, the rest the last name.
update public.profiles
set first_name = left(split_part(btrim(full_name), ' ', 1), 50),
    last_name = left(btrim(substr(btrim(full_name), char_length(split_part(btrim(full_name), ' ', 1)) + 1)), 50)
where btrim(coalesce(full_name, '')) <> ''
  and first_name = '' and last_name = '';
