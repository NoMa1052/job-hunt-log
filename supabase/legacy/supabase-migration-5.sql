alter table conversations
  add column if not exists email text default '',
  add column if not exists phone text default '',
  add column if not exists other_contact text default '';
