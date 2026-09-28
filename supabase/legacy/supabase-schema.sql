create table applications (
  id uuid primary key default gen_random_uuid(),
  company text default '',
  position text default '',
  location text default '',
  date_applied date,
  status text default 'applied',
  priority text default 'medium',
  source text default '',
  salary text default '',
  cover_letter_link text default '',
  hiring_manager text default '',
  connections text default '',
  link text default '',
  next_action text default '',
  follow_up_date date,
  interview_date date,
  notes text default '',
  created_at timestamptz default now()
);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  date date,
  person text default '',
  context text default '',
  recommendation text default '',
  notes text default '',
  created_at timestamptz default now()
);

insert into applications (company, position, location, date_applied, status, link)
values ('MLB', 'Operations Analyst, Baseball Data Platform', 'New York, NY', '2026-07-09', 'applied',
  'https://www.mlb.com/careers/opportunities?gh_jid=7886343&source=LinkedIn');
