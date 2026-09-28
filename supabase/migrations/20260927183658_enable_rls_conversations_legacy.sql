-- Originally applied directly to production (2026-09-27) to close the
-- critical "RLS disabled" advisory on the deprecated conversations_legacy table.
--
-- Rewritten to be idempotent so the same migration history applies cleanly to
-- production (already applied), sidekick-dev (table already has RLS) and a fresh
-- database (table doesn't exist yet at this point; the baseline below creates
-- it with RLS enabled).
do $$
begin
  if to_regclass('public.conversations_legacy') is not null then
    alter table public.conversations_legacy enable row level security;
  end if;
end
$$;
