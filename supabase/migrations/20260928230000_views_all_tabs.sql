-- Saved views on every tab (Conversations = 'people', Companies =
-- 'companies'), and a default view per tab.
-- Idempotent; safe on production, sidekick-dev and a fresh database.

alter table public.table_views drop constraint if exists table_views_table_name_check;
alter table public.table_views add constraint table_views_table_name_check
  check (table_name in ('applications', 'people', 'companies'));

-- The view each tab opens with. At most one per user and tab.
alter table public.table_views add column if not exists is_default boolean not null default false;
create unique index if not exists table_views_one_default_idx
  on public.table_views (user_id, table_name) where is_default;

-- Carry over the existing Applications default from the profile.
-- profiles.default_view_id stays for older clients; new code reads is_default.
update public.table_views v
set is_default = true
from public.profiles p
where p.default_view_id = v.id
  and p.user_id = v.user_id
  and v.table_name = 'applications'
  and not exists (
    select 1 from public.table_views d
    where d.user_id = v.user_id and d.table_name = v.table_name and d.is_default
  );

comment on column public.profiles.default_view_id is
  'Deprecated: the Applications default view before per-tab defaults. Use table_views.is_default.';
