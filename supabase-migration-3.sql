create table companies (
  id uuid primary key default gen_random_uuid(),
  company text default '',
  careers_link text default '',
  notes text default '',
  created_at timestamptz default now()
);
