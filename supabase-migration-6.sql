-- Companies: threaded notes
create table company_notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  note text default '',
  created_at timestamptz default now()
);

insert into company_notes (company_id, note, created_at)
select id, notes, created_at from companies where notes is not null and notes <> '';

-- Conversations: people + threaded entries
create table people (
  id uuid primary key default gen_random_uuid(),
  name text default '',
  company text default '',
  email text default '',
  phone text default '',
  other_contact text default '',
  legacy_conversation_id uuid,
  created_at timestamptz default now()
);

insert into people (name, company, email, phone, other_contact, legacy_conversation_id)
select person, context, email, phone, other_contact, id from conversations;

create table conversation_entries (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references people(id) on delete cascade,
  date date,
  recommendation text default '',
  notes text default '',
  created_at timestamptz default now()
);

insert into conversation_entries (person_id, date, recommendation, notes, created_at)
select p.id, c.date, c.recommendation, c.notes, c.created_at
from conversations c
join people p on p.legacy_conversation_id = c.id;

alter table people drop column legacy_conversation_id;

alter table conversations rename to conversations_legacy;
