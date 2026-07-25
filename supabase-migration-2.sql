alter table applications
  add column if not exists priority text default 'medium',
  add column if not exists source text default '',
  add column if not exists salary text default '',
  add column if not exists cover_letter_link text default '',
  add column if not exists next_action text default '',
  add column if not exists follow_up_date date,
  add column if not exists interview_date date,
  add column if not exists notes text default '';

alter table applications drop column if exists cover_letter;
