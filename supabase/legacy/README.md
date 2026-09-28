# Legacy SQL (reference only)

These files were applied by hand in the Supabase SQL editor before the project used tracked migrations. They're kept for history only.

- They don't match production. `supabase-schema.sql` creates the old `conversations` table and seeds a personal application row.
- Don't run them. The current schema is defined by `../migrations/`, starting with `20260927214418_baseline_from_production.sql`.
